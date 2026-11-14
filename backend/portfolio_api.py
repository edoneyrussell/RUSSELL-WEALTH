import simulation_prices
from account_access import customer_user_id
from customer_accounts import selected_account
from flask import Blueprint, jsonify, session
from authorization import role_required
from database import get_db_connection
from decimal import Decimal
from portfolio_history import observe_portfolio
from trade_catalog import stock_catalog
from exchanges import exchange_code

portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.after_request
def prevent_portfolio_caching(response):
    # Holdings are private account state and must be read from the current database.
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response


@portfolio_bp.route("/api/customer/portfolio", methods=["GET"])
@role_required("CUSTOMER")
def get_portfolio():
    conn = get_db_connection()

    try:
        portfolio_user_id = customer_user_id(conn)

        account = selected_account(conn, portfolio_user_id)

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
            if quantity <= 0:
                continue
            price_cents = simulation_prices.stock_price_cents(row["symbol"],row["asset_type"],row["price_cents"])
            value_cents = quantity * Decimal(price_cents)
            invested_cents += value_cents

            metadata = stock_catalog().get(row['symbol']) or stock_catalog().get(row['symbol'] + '.TO') or {}
            market = exchange_code(row['symbol'], row['asset_type'], metadata.get('exchange', ''))
            holdings.append({
                "symbol": row["symbol"],
                "name": metadata.get("name", row["name"]),
                "type": metadata.get("type", row["asset_type"]),
                "exchange": market,
                "currency": row["currency"],
                "quantity": str(quantity),
                "price": str(Decimal(price_cents) / 100),
                "market_value": str(value_cents / 100)
            })

        cash = Decimal(account["cash_balance_cents"]) / 100
        invested = invested_cents / 100

        return jsonify({
            "account_id": account["id"],
            "account_type": account["account_type"],
            "management_mode": account["management_mode"],
            "account_name": account["account_name"],
            "currency": "CAD",
            "cash_balance": str(cash),
            "invested_value": str(invested),
            "total_value": str(cash + invested),
            "history": observe_portfolio(conn, account["id"], (cash + invested) * 100),
            "holdings": holdings
        })

    finally:
        conn.close()
