from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import os
from flask import Blueprint, jsonify, request, session
from authorization import role_required
from database import get_db_connection
from market_data import get_quote, get_usd_cad_rate

trading_bp = Blueprint("trading", __name__)


@trading_bp.route("/api/customer/assets", methods=["GET"])
@role_required("CUSTOMER")
def list_assets():
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT symbol, name, asset_type, currency, price_cents
            FROM assets
            ORDER BY symbol
            """
        ).fetchall()

        return jsonify({
            "assets": [
                {
                    "symbol": row["symbol"],
                    "name": row["name"],
                    "type": row["asset_type"],
                    "currency": row["currency"],
                    "price": str(Decimal(row["price_cents"]) / 100)
                }
                for row in rows
            ]
        })
    finally:
        conn.close()


@trading_bp.route("/api/customer/trade", methods=["POST"])
@role_required("CUSTOMER")
def execute_trade():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body"}), 400

    symbol = data.get("symbol")
    action = data.get("action")
    raw_quantity = data.get("quantity")

    if not isinstance(symbol, str) or not isinstance(action, str):
        return jsonify({"error": "Invalid symbol or action"}), 400

    symbol = symbol.strip().upper()
    action = action.strip().upper()

    if action not in ("BUY", "SELL"):
        return jsonify({"error": "Action must be BUY or SELL"}), 400

    if not isinstance(raw_quantity, (str, int)) or isinstance(raw_quantity, bool):
        return jsonify({"error": "Quantity must be a positive whole number"}), 400

    try:
        quantity = Decimal(str(raw_quantity))
    except InvalidOperation:
        return jsonify({"error": "Invalid quantity"}), 400

    if (
        not quantity.is_finite()
        or quantity <= 0
        or quantity != quantity.to_integral_value()
        or quantity > 1000000
    ):
        return jsonify({"error": "Quantity must be a positive whole number up to 1,000,000"}), 400

    quantity = int(quantity)
    conn = get_db_connection()

    try:
        conn.execute("BEGIN IMMEDIATE")

        account_sql = """
            SELECT id, cash_balance_cents
            FROM investment_accounts
            WHERE user_id = ?
            ORDER BY id
            LIMIT 1
        """
        if os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres":
            account_sql += " FOR UPDATE"
        account = conn.execute(
            account_sql, (session["user_id"],)
        ).fetchone()

        if account is None:
            conn.rollback()
            return jsonify({"error": "Investment account not found"}), 404

        # Normalize existing Canadian holdings without changing their IDs.
        lookup_symbol = symbol
        if symbol.endswith(".TO"):
            base_symbol = symbol[:-3]
            existing = conn.execute(
                "SELECT id FROM assets WHERE symbol = ? AND currency = 'CAD'",
                (base_symbol,)
            ).fetchone()
            if existing:
                lookup_symbol = base_symbol

        asset = conn.execute(
            """
            SELECT id, symbol, price_cents, currency
            FROM assets
            WHERE symbol = ?
            """,
            (lookup_symbol,)
        ).fetchone()

        # Existing seeded assets retain their simulated prices.
        # New assets require a valid market quote.
        if asset is None:
            import datetime

            market_symbol = symbol
            quote = get_quote(market_symbol)

            raw_price = Decimal(str(quote["price"]))
            if not raw_price.is_finite() or raw_price <= 0:
                conn.rollback()
                return jsonify({"error": "Invalid market price"}), 400

            quote_date = quote.get("as_of")
            if quote_date is None:
                conn.rollback()
                return jsonify({"error": "Quote timestamp unavailable"}), 400

            if isinstance(quote_date, (int, float)):
                quoted = datetime.datetime.fromtimestamp(
                    quote_date, datetime.timezone.utc
                ).date()
            else:
                quoted = datetime.date.fromisoformat(
                    str(quote_date)[:10]
                )

            age = (datetime.datetime.now(datetime.timezone.utc).date() - quoted).days
            if age < 0 or age > 5:
                conn.rollback()
                return jsonify({"error": "Market quote is stale"}), 400

            currency = quote["currency"]

            if currency == "USD":
                raw_price *= get_usd_cad_rate()
            elif currency != "CAD":
                conn.rollback()
                return jsonify({"error": "Unsupported currency"}), 400

            price_cents = int(
                (raw_price * 100).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )

            if price_cents <= 0:
                conn.rollback()
                return jsonify({"error": "Invalid converted price"}), 400

            conn.execute(
                """
                INSERT INTO assets
                (symbol, name, asset_type, currency, price_cents)
                VALUES (?, ?, ?, 'CAD', ?)
                """,
                (symbol, symbol, "STOCK", price_cents)
            )

            asset = conn.execute(
                """
                SELECT id, symbol, price_cents, currency
                FROM assets WHERE symbol = ?
                """,
                (symbol,)
            ).fetchone()

        amount_cents = quantity * asset["price_cents"]

        holding = conn.execute(
            """
            SELECT id, quantity
            FROM holdings
            WHERE account_id = ? AND asset_id = ?
            """,
            (account["id"], asset["id"])
        ).fetchone()

        owned = Decimal(holding["quantity"]) if holding else Decimal("0")

        if action == "BUY":
            if account["cash_balance_cents"] < amount_cents:
                conn.rollback()
                return jsonify({"error": "Insufficient cash balance"}), 400

            new_cash = account["cash_balance_cents"] - amount_cents
            new_quantity = owned + quantity

        else:
            if owned < quantity:
                conn.rollback()
                return jsonify({"error": "Insufficient shares"}), 400

            new_cash = account["cash_balance_cents"] + amount_cents
            new_quantity = owned - quantity

        conn.execute(
            """
            UPDATE investment_accounts
            SET cash_balance_cents = ?
            WHERE id = ?
            """,
            (new_cash, account["id"])
        )

        if holding:
            if new_quantity == 0:
                conn.execute(
                    "DELETE FROM holdings WHERE id = ?",
                    (holding["id"],)
                )
            else:
                conn.execute(
                    "UPDATE holdings SET quantity = ? WHERE id = ?",
                    (str(new_quantity), holding["id"])
                )
        else:
            conn.execute(
                """
                INSERT INTO holdings (account_id, asset_id, quantity)
                VALUES (?, ?, ?)
                """,
                (account["id"], asset["id"], str(new_quantity))
            )

        conn.execute(
            """
            INSERT INTO transactions
            (account_id, asset_id, transaction_type, quantity, amount_cents)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                account["id"],
                asset["id"],
                action,
                str(quantity),
                amount_cents
            )
        )

        conn.commit()

        return jsonify({
            "success": True,
            "action": action,
            "symbol": symbol,
            "quantity": str(quantity),
            "trade_value": str(Decimal(amount_cents) / 100),
            "cash_balance": str(Decimal(new_cash) / 100),
            "shares_owned": str(new_quantity)
        })

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@trading_bp.route("/api/customer/transactions", methods=["GET"])
@role_required("CUSTOMER", "SOC_ADMIN")
def transaction_history():
    conn = get_db_connection()
    try:
        uid = session["user_id"]

        trades = conn.execute("""
            SELECT
                'stock-' || t.id AS id,
                t.transaction_type AS action,
                t.quantity,
                t.amount_cents,
                t.created_at,
                a.symbol,
                a.name
            FROM transactions t
            JOIN investment_accounts ia ON t.account_id = ia.id
            LEFT JOIN assets a ON t.asset_id = a.id
            WHERE ia.user_id = ?
               OR ia.user_id IN (
                   SELECT id FROM users
                   WHERE email = 'customer@russellwealth.local'
               )
        """, (uid,)).fetchall()

        banking = conn.execute("""
            SELECT
                'bank-' || id AS id,
                direction AS action,
                amount_cents,
                created_at,
                bank_code
            FROM rw_demo_bank_transfers
            WHERE user_id = ?
        """, (uid,)).fetchall()

        result = []

        for row in trades:
            amount = Decimal(row["amount_cents"]) / 100
            quantity = Decimal(row["quantity"]) if row["quantity"] else None

            result.append({
                "id": row["id"],
                "action": row["action"],
                "symbol": row["symbol"] or "RUSSELL WEALTH",
                "name": row["name"] or "Investment Account",
                "quantity": str(quantity) if quantity is not None else None,
                "price": str(amount / quantity) if quantity else None,
                "total": str(amount),
                "created_at": row["created_at"],
                "category": "STOCK" if row["action"] in ("BUY", "SELL") else "BANK",
                "bank_code": None
            })

        for row in banking:
            result.append({
                "id": row["id"],
                "action": "DEPOSIT" if row["action"] == "DEPOSIT" else "WITHDRAWAL",
                "symbol": row["bank_code"],
                "name": row["bank_code"] + " · Simulated Bank",
                "quantity": None,
                "price": None,
                "total": str(Decimal(row["amount_cents"]) / 100),
                "created_at": row["created_at"],
                "category": "BANK",
                "bank_code": row["bank_code"]
            })

        result.sort(
            key=lambda row: (row["created_at"], str(row["id"])),
            reverse=True
        )

        return jsonify({"transactions": result})

    finally:
        conn.close()
