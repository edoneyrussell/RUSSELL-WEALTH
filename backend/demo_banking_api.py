
from flask import Blueprint, jsonify, request, session
from authorization import role_required
from database import get_db_connection
from decimal import Decimal, InvalidOperation
import sqlite3
import psycopg
import uuid

banking_bp = Blueprint("rw_banking", __name__)

BANKS = [
    ("TD", "TD Canada Trust", "TD"),
    ("RBC", "Royal Bank of Canada", "RBC"),
    ("SCOTIA", "Scotiabank", "Scotiabank"),
    ("BMO", "Bank of Montreal", "BMO"),
    ("CIBC", "CIBC", "CIBC"),
    ("NBC", "National Bank of Canada", "National Bank"),
    ("DESJARDINS", "Desjardins", "Desjardins"),
    ("TANGERINE", "Tangerine", "Tangerine"),
    ("SIMPLII", "Simplii Financial", "Simplii"),
    ("EQ", "EQ Bank", "EQ Bank"),
    ("ATB", "ATB Financial", "ATB"),
    ("LAURENTIAN", "Laurentian Bank", "Laurentian"),
    ("WEALTHSIMPLE", "Wealthsimple", "Wealthsimple"),
    ("MOTIVE", "Motive Financial", "Motive"),
    ("MANULIFE", "Manulife Bank", "Manulife"),
    ("COASTCAPITAL", "Coast Capital Savings", "Coast Capital"),
    ("VANCITY", "Vancity Credit Union", "Vancity"),
    ("MERIDIAN", "Meridian Credit Union", "Meridian"),
    ("DUCA", "DUCA Credit Union", "DUCA"),
    ("FIRSTONTARIO", "FirstOntario Credit Union", "FirstOntario"),
    ("CONEXUS", "Conexus Credit Union", "Conexus"),
    ("AFFINITY", "Affinity Credit Union", "Affinity"),
    ("SERVUS", "Servus Credit Union", "Servus"),
    ("CONNECTFIRST", "connectFirst Credit Union", "connectFirst"),
    ("CAMBRIAN", "Cambrian Credit Union", "Cambrian"),
    ("ASSINIBOINE", "Assiniboine Credit Union", "Assiniboine"),
    ("STEINBACH", "Steinbach Credit Union", "Steinbach"),
    ("ICICI", "ICICI Bank Canada", "ICICI"),
    ("HSBC", "HSBC Bank Canada (Historical)", "HSBC"),
    ("CANADIANWESTERN", "Canadian Western Bank (Historical)", "CWB"),
]

INITIAL_CENTS = 100000000

def initialize(conn):
    if hasattr(conn, "connection"):
        # PostgreSQL tables already exist through Neon migrations.
        return

    conn.execute("""
        CREATE TABLE IF NOT EXISTS rw_demo_bank_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bank_code TEXT NOT NULL,
            balance_cents INTEGER NOT NULL DEFAULT 100000000
                CHECK (balance_cents >= 0),
            UNIQUE(user_id, bank_code)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rw_demo_bank_transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transfer_id TEXT NOT NULL UNIQUE,
            request_id TEXT,
            user_id INTEGER NOT NULL,
            bank_code TEXT NOT NULL,
            direction TEXT NOT NULL CHECK (
                direction IN ('DEPOSIT', 'WITHDRAW')
            ),
            amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    columns = {
        row["name"]
        for row in conn.execute(
            "PRAGMA table_info(rw_demo_bank_transfers)"
        ).fetchall()
    }
    if "request_id" not in columns:
        conn.execute(
            "ALTER TABLE rw_demo_bank_transfers ADD COLUMN request_id TEXT"
        )
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS
        rw_demo_transfer_request_unique
        ON rw_demo_bank_transfers(user_id, request_id)
        WHERE request_id IS NOT NULL
    """)

def customer_id():
    return session.get("user_id")

def ensure_banks(conn, uid):
    for code, _, _ in BANKS:
        if hasattr(conn, "connection"):
            conn.execute("""
                INSERT INTO rw_demo_bank_accounts
                (user_id, bank_code, balance_cents)
                VALUES (?, ?, ?)
                ON CONFLICT (user_id, bank_code) DO NOTHING
            """, (uid, code, INITIAL_CENTS))
        else:
            conn.execute("""
                INSERT OR IGNORE INTO rw_demo_bank_accounts
                (user_id, bank_code, balance_cents)
                VALUES (?, ?, ?)
            """, (uid, code, INITIAL_CENTS))

def get_account(conn, uid):
    postgres = hasattr(conn, "connection")

    query = """
        SELECT id, cash_balance_cents
        FROM investment_accounts
        WHERE user_id = ?
        ORDER BY id
        LIMIT 1
    """

    if postgres:
        query += " FOR UPDATE"

    return conn.execute(query, (uid,)).fetchone()

def money(cents):
    return str(Decimal(cents) / Decimal(100))

@banking_bp.route("/api/customer/demo-banking", methods=["GET"])
@role_required("CUSTOMER", "SOC_ADMIN")
def demo_banking_status():
    uid = customer_id()
    conn = get_db_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        initialize(conn)
        ensure_banks(conn, uid)
        account = get_account(conn, uid)
        if account is None:
            conn.rollback()
            return jsonify(error="Investment account not found"), 404

        rows = conn.execute("""
            SELECT bank_code, balance_cents
            FROM rw_demo_bank_accounts
            WHERE user_id = ?
        """, (uid,)).fetchall()

        balances = {r["bank_code"]: r["balance_cents"] for r in rows}

        history = conn.execute("""
            SELECT transfer_id, bank_code, direction,
                   amount_cents, created_at
            FROM rw_demo_bank_transfers
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 30
        """, (uid,)).fetchall()

        result = {
            "simulated": True,
            "currency": "CAD",
            "cash_balance": money(account["cash_balance_cents"]),
            "banks": [
                {
                    "code": code,
                    "name": name,
                    "short_name": short,
                    "balance": money(balances[code])
                }
                for code, name, short in BANKS
            ],
            "history": [
                {
                    "id": r["transfer_id"],
                    "bank_code": r["bank_code"],
                    "direction": r["direction"],
                    "amount": money(r["amount_cents"]),
                    "created_at": r["created_at"]
                }
                for r in history
            ]
        }
        conn.commit()
        return jsonify(result)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@banking_bp.route("/api/customer/demo-banking/transfer", methods=["POST"])
@role_required("CUSTOMER", "SOC_ADMIN")
def demo_banking_transfer():
    data = request.get_json(silent=True) or {}
    code = data.get("bank_code")
    direction = data.get("direction")

    if code not in {b[0] for b in BANKS}:
        return jsonify(error="Invalid bank"), 400
    if direction not in ("DEPOSIT", "WITHDRAW"):
        return jsonify(error="Invalid transfer direction"), 400

    try:
        amount = Decimal(str(data.get("amount", "")))
        if not amount.is_finite() or amount <= 0:
            raise ValueError()
        cents_value = amount * 100
        if cents_value != cents_value.to_integral_value():
            raise ValueError()
        cents = int(cents_value)
        if cents > 100000000000:
            raise ValueError()
    except (InvalidOperation, ValueError, OverflowError):
        return jsonify(error="Enter a valid positive CAD amount"), 400

    uid = customer_id()
    request_id = data.get("request_id")

    if not isinstance(request_id, str) or not (
        8 <= len(request_id) <= 100
    ):
        return jsonify(error="Invalid transfer request ID"), 400

    conn = get_db_connection()

    try:
        conn.execute("BEGIN IMMEDIATE")
        initialize(conn)

        # Serialize transfers for this investment account on PostgreSQL.
        account = get_account(conn, uid)

        if account is None:
            conn.rollback()
            return jsonify(error="Account unavailable"), 404

        ensure_banks(conn, uid)

        previous = conn.execute("""
            SELECT transfer_id, direction, amount_cents, bank_code
            FROM rw_demo_bank_transfers
            WHERE user_id = ? AND request_id = ?
        """, (uid, request_id)).fetchone()

        if previous:
            if (
                previous["direction"] != direction
                or previous["bank_code"] != code
                or previous["amount_cents"] != cents
            ):
                conn.rollback()
                return jsonify(error="Request ID already used"), 409

            conn.commit()
            return jsonify({
                "success": True,
                "simulated": True,
                "transfer_id": previous["transfer_id"],
                "direction": direction,
                "amount": money(cents),
                "message": "Simulated transfer already completed"
            })

        bank = conn.execute("""
            SELECT id, balance_cents
            FROM rw_demo_bank_accounts
            WHERE user_id = ? AND bank_code = ?
        """, (uid, code)).fetchone()

        if account is None or bank is None:
            conn.rollback()
            return jsonify(error="Account unavailable"), 404

        if direction == "DEPOSIT":
            # Demo funding: add simulated investment cash
            # without deducting the selected bank balance.
            bank_delta = 0
            cash_delta = cents
        else:
            if cents > account["cash_balance_cents"]:
                conn.rollback()
                return jsonify(error="Insufficient investment cash"), 409

            bank_delta = cents
            cash_delta = -cents

        if False:
            conn.rollback()
            return jsonify(error="Maximum bank balance is $900,000 CAD"), 400

        if direction == "DEPOSIT":
            # Demo funding does not change the simulated bank balance.
            updated_bank_count = 1
        else:
            updated_bank = conn.execute("""
                UPDATE rw_demo_bank_accounts
                SET balance_cents = balance_cents + ?
                WHERE id = ? AND user_id = ?
                  AND balance_cents + ? >= 0
            """, (bank_delta, bank["id"], uid, bank_delta))
            updated_bank_count = updated_bank.rowcount

        updated_cash = conn.execute("""
            UPDATE investment_accounts
            SET cash_balance_cents = cash_balance_cents + ?
            WHERE id = ? AND user_id = ?
              AND cash_balance_cents + ? >= 0
        """, (cash_delta, account["id"], uid, cash_delta))

        if updated_bank_count != 1 or updated_cash.rowcount != 1:
            conn.rollback()
            return jsonify(error="Transfer could not be completed"), 409

        transfer_id = str(uuid.uuid4())

        conn.execute("""
            INSERT INTO rw_demo_bank_transfers
            (transfer_id, request_id, user_id, bank_code, direction, amount_cents)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (transfer_id, request_id, uid, code, direction, cents))

        conn.commit()

        return jsonify({
            "success": True,
            "simulated": True,
            "transfer_id": transfer_id,
            "direction": direction,
            "amount": money(cents),
            "message": "Simulated transfer completed"
        })
    except (sqlite3.Error, psycopg.Error):
        conn.rollback()
        return jsonify(error="Database transfer failed"), 500
    finally:
        conn.close()
