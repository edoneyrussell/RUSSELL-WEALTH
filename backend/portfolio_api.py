import simulation_prices
from account_access import customer_user_id
from customer_accounts import selected_account
from flask import Blueprint, jsonify, request, session
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

        if request.args.get('account_id') == 'all':
            accounts = conn.execute("SELECT * FROM investment_accounts WHERE user_id=? AND status='OPEN' ORDER BY id", (portfolio_user_id,)).fetchall()
            portfolios = [account_portfolio(conn, account) for account in accounts]
            return jsonify(combine_portfolios(portfolios))

        account = selected_account(conn, portfolio_user_id)

        if account is None:
            return jsonify({"error": "Portfolio not found"}), 404

        return jsonify(account_portfolio(conn, account))

    finally:
        conn.close()


def account_portfolio(conn, account):
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

    return {
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
    }


def combine_portfolios(portfolios):
    holdings = {}
    for portfolio in portfolios:
        for holding in portfolio['holdings']:
            key = (holding['symbol'], holding['currency'], holding['exchange'])
            if key not in holdings:
                holdings[key] = {**holding, 'quantity': '0', 'market_value': '0'}
            combined = holdings[key]
            for field in ('quantity', 'market_value'):
                combined[field] = str(Decimal(combined[field]) + Decimal(holding[field]))
    cash = sum((Decimal(p['cash_balance']) for p in portfolios), Decimal(0))
    invested = sum((Decimal(p['invested_value']) for p in portfolios), Decimal(0))
    # Only compare totals once every funded account has a recorded observation.
    histories = [p['history'] for p in portfolios if p['history']]
    history = []
    if histories:
        start = max(points[0]['time'] for points in histories)
        events = sorted((point['time'], index, Decimal(str(point['value'])))
                        for index, points in enumerate(histories) for point in points)
        balances = {}
        totals = {}
        for time, index, value in events:
            balances[index] = value
            if time >= start:
                totals[time] = float(sum(balances.values(), Decimal(0)))
        history = [dict(time=time, value=value) for time, value in totals.items()]
    return dict(account_id=None, account_name='All accounts', account_type='ALL',
                management_mode=None, currency='CAD', cash_balance=str(cash),
                invested_value=str(invested), total_value=str(cash + invested),
                holdings=sorted(holdings.values(), key=lambda holding: holding['symbol']), history=history)
