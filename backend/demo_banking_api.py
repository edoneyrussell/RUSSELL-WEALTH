
from flask import Blueprint, jsonify, request, session
from authorization import role_required
from database import get_db_connection
from decimal import Decimal, InvalidOperation
import sqlite3
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
]

INITIAL_CENTS = 100000000

def initialize(conn):
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
        conn.execute("""
            INSERT OR IGNORE INTO rw_demo_bank_accounts
            (user_id, bank_code, balance_cents)
            VALUES (?, ?, ?)
        """, (uid, code, INITIAL_CENTS))

def get_account(conn, uid):
    return conn.execute("""
        SELECT id, cash_balance_cents
        FROM investment_accounts
        WHERE user_id = ?
        ORDER BY id
        LIMIT 1
    """, (uid,)).fetchone()

def money(cents):
    return str(Decimal(cents) / Decimal(100))

@banking_bp.route("/api/customer/demo-banking", methods=["GET"])
@role_required("CUSTOMER")
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
@role_required("CUSTOMER")
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

        account = get_account(conn, uid)
        bank = conn.execute("""
            SELECT id, balance_cents
            FROM rw_demo_bank_accounts
            WHERE user_id = ? AND bank_code = ?
        """, (uid, code)).fetchone()

        if account is None or bank is None:
            conn.rollback()
            return jsonify(error="Account unavailable"), 404

        if direction == "DEPOSIT":
            if bank["balance_cents"] < cents:
                conn.rollback()
                return jsonify(error="Insufficient simulated bank funds"), 400
            bank_delta = -cents
            cash_delta = cents
        else:
            if account["cash_balance_cents"] < cents:
                conn.rollback()
                return jsonify(error="Insufficient investment cash"), 400
            bank_delta = cents
            cash_delta = -cents

        updated_bank = conn.execute("""
            UPDATE rw_demo_bank_accounts
            SET balance_cents = balance_cents + ?
            WHERE id = ? AND user_id = ?
              AND balance_cents + ? >= 0
        """, (bank_delta, bank["id"], uid, bank_delta))

        updated_cash = conn.execute("""
            UPDATE investment_accounts
            SET cash_balance_cents = cash_balance_cents + ?
            WHERE id = ? AND user_id = ?
              AND cash_balance_cents + ? >= 0
        """, (cash_delta, account["id"], uid, cash_delta))

        if updated_bank.rowcount != 1 or updated_cash.rowcount != 1:
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
    except sqlite3.Error:
        conn.rollback()
        return jsonify(error="Database transfer failed"), 500
    finally:
        conn.close()
