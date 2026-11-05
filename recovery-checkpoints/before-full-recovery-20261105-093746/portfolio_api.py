from flask import Blueprint, jsonify, session
from authorization import role_required
from database import get_db_connection
from decimal import Decimal

portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.route("/api/customer/portfolio", methods=["GET"])
@role_required("CUSTOMER", "SOC_ADMIN")
def get_portfolio():
    conn = get_db_connection()

    try:
        portfolio_user_id = session["user_id"]

        if session.get("role") == "SOC_ADMIN":
            linked = conn.execute(
                """
                SELECT l.customer_user_id
                FROM admin_customer_links l
                JOIN users u ON u.id = l.customer_user_id
                WHERE l.admin_user_id = ?
                  AND u.role = 'CUSTOMER'
                ORDER BY l.customer_user_id
                LIMIT 1
                """,
                (portfolio_user_id,)
            ).fetchone()

            if linked is None:
                return jsonify({
                    "error": "No authorized customer portfolio"
                }), 403

            portfolio_user_id = linked["customer_user_id"]

        account = conn.execute(
            """
            SELECT id, account_name, cash_balance_cents
            FROM investment_accounts
            WHERE user_id = ?
            ORDER BY id LIMIT 1
            """,
            (session["user_id"],)
        ).fetchone()

        if account is None:
            return jsonify({"error": "Portfolio not found"}), 404

        rows = conn.execute(
            """
            SELECT a.symbol, a.name, a.asset_type,
                   a.currency, a.price_cents, h.quantity
            FROM holdings h
            JOIN assets a ON h.asset_id = a.id
            WHERE h.account_id = ?
            ORDER BY a.symbol
            """,
            (account["id"],)
        ).fetchall()

        holdings = []
        invested_cents = Decimal("0")

        for row in rows:
            quantity = Decimal(row["quantity"])
            value_cents = quantity * Decimal(row["price_cents"])
            invested_cents += value_cents

            holdings.append({
                "symbol": row["symbol"],
                "name": row["name"],
                "type": row["asset_type"],
                "currency": row["currency"],
                "quantity": str(quantity),
                "price": str(Decimal(row["price_cents"]) / 100),
                "market_value": str(value_cents / 100)
            })

        cash = Decimal(account["cash_balance_cents"]) / 100
        invested = invested_cents / 100

        return jsonify({
            "account_name": account["account_name"],
            "currency": "CAD",
            "cash_balance": str(cash),
            "invested_value": str(invested),
            "total_value": str(cash + invested),
            "holdings": holdings
        })

    finally:
        conn.close()
