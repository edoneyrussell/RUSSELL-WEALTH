import simulation_prices
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import os
from flask import Blueprint, jsonify, request, session
from authorization import role_required
from account_access import customer_user_id
from customer_accounts import selected_account, AccountError
from database import get_db_connection
from trade_catalog import available_assets, stock_catalog, SIMULATION_PRICE_CENTS

from trading_hours import market_status, exchange_status
from exchanges import EXCHANGES, exchange_code

trading_bp = Blueprint("trading", __name__)


@trading_bp.route("/api/customer/assets", methods=["GET"])
@role_required("CUSTOMER")
def list_assets():
    conn = get_db_connection()
    try:
        assets = available_assets(conn)
        response = jsonify(assets=assets, count=len(assets), pricing='SIMULATED')
        response.headers['Cache-Control'] = 'private, no-store'
        return response
    finally:
        conn.close()


@trading_bp.get('/api/customer/exchanges')
@role_required('CUSTOMER')
def list_exchanges():
    response = jsonify(exchanges=[dict(code=code, **details, status=exchange_status(code))
                                  for code, details in EXCHANGES.items()])
    response.headers['Cache-Control'] = 'private, no-store'
    return response


@trading_bp.get('/api/customer/trading-status')
@role_required('CUSTOMER')
def trading_status():
    symbol = request.args.get('symbol', '').strip().upper()
    if not symbol:
        return jsonify(error='Symbol required'), 400
    metadata = stock_catalog().get(symbol) or stock_catalog().get(symbol + '.TO')
    if metadata is None:
        conn = get_db_connection()
        try:
            row = conn.execute('SELECT asset_type FROM assets WHERE symbol=?', (symbol,)).fetchone()
            metadata = dict(type=row['asset_type'], exchange='') if row else None
        finally:
            conn.close()
    if metadata is None:
        return jsonify(error='This asset is not supported for trading.'), 400
    response = jsonify(market_status(symbol, metadata['type'], metadata.get('exchange', '')))
    response.headers['Cache-Control'] = 'private, no-store'
    return response


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
        or quantity > 1000000
    ):
        return jsonify({"error": "Quantity must be a positive whole number up to 1,000,000"}), 400

    conn = get_db_connection()

    try:
        conn.execute("BEGIN IMMEDIATE")

        account = selected_account(conn, requested=data.get('account_id'), lock=True)

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
            base_metadata = stock_catalog().get(base_symbol)
            if existing and (base_metadata is None or exchange_code(base_symbol, base_metadata['type'], base_metadata.get('exchange', '')) == 'TSX'):
                lookup_symbol = base_symbol

        asset = conn.execute(
            """
            SELECT id, symbol, name, asset_type, price_cents, currency
            FROM assets
            WHERE symbol = ?
            """,
            (lookup_symbol,)
        ).fetchone()

        metadata = stock_catalog().get(symbol) or stock_catalog().get(lookup_symbol)
        if metadata is None and asset is not None:
            metadata = stock_catalog().get(lookup_symbol + '.TO') or dict(
                symbol=lookup_symbol, name=asset['name'], type=asset['asset_type'], exchange='')
        if metadata is None:
            conn.rollback()
            return jsonify(error='This asset is not supported for trading.'), 400
        asset_type = metadata['type']
        if account['management_mode'] != 'SELF_DIRECTED':
            raise AccountError('Select a self-directed account to place trades.')
        if account['account_type'] == 'CRYPTO' and asset_type != 'CRYPTO':
            raise AccountError('This account supports crypto only.')
        if account['account_type'] not in ('PERSONAL', 'CRYPTO') and asset_type == 'CRYPTO':
            raise AccountError('Select a Crypto or Personal account for cryptocurrency trades.')
        crypto = asset_type == 'CRYPTO'
        if (not crypto and quantity != quantity.to_integral_value()) or (crypto and quantity.as_tuple().exponent < -8):
            conn.rollback()
            return jsonify(error='Crypto supports up to 8 decimal places.' if crypto else 'Quantity must be a positive whole number.'), 400
        status = market_status(symbol, asset_type, metadata.get('exchange', ''))
        if not status['is_open']:
            conn.rollback()
            return jsonify(error=status['message'], code='MARKET_CLOSED', market_status=status), 409

        # Stored prices are a fallback; supported assets use the shared daily simulation.
        if asset is None:
            if action == 'SELL':
                conn.rollback()
                return jsonify(error='Insufficient shares'), 400
            price_cents = SIMULATION_PRICE_CENTS

            conn.execute(
                """
                INSERT INTO assets
                (symbol, name, asset_type, currency, price_cents)
                VALUES (?, ?, ?, 'CAD', ?)
                """,
                (symbol, metadata.get("name", symbol), metadata.get("type", "STOCK"), price_cents)
            )

            asset = conn.execute(
                """
                SELECT id, symbol, name, asset_type, price_cents, currency
                FROM assets WHERE symbol = ?
                """,
                (symbol,)
            ).fetchone()

        if asset['asset_type'] != asset_type:
            conn.execute('UPDATE assets SET asset_type=? WHERE id=?', (asset_type, asset['id']))

        price_cents = simulation_prices.stock_price_cents(asset["symbol"],asset_type,asset["price_cents"])
        raw_amount = quantity * price_cents
        amount_cents = int(raw_amount.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        if amount_cents <= 0 or raw_amount != Decimal(amount_cents):
            conn.rollback()
            return jsonify(error='Adjust the quantity so the trade value is at least CA$0.01 and has no fractions of a cent.'), 400

        holding = conn.execute(
            """
            SELECT id, quantity
            FROM holdings
            WHERE account_id = ? AND asset_id = ?
            """,
            (account["id"], asset["id"])
        ).fetchone()

        owned = Decimal(holding["quantity"]) if holding else Decimal("0")
        from account_limits import MAX_ACCOUNT_CENTS
        if action == 'SELL' and account['cash_balance_cents'] + amount_cents > MAX_ACCOUNT_CENTS:
            return jsonify(error='Account cash cannot exceed CA$900 million.'), 400

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
                    (format(new_quantity.normalize(), 'f'), holding["id"])
                )
        else:
            conn.execute(
                """
                INSERT INTO holdings (account_id, asset_id, quantity)
                VALUES (?, ?, ?)
                """,
                (account["id"], asset["id"], format(new_quantity.normalize(), 'f'))
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
                format(quantity, 'f'),
                amount_cents
            )
        )

        conn.commit()

        return jsonify({
            "success": True,
            "action": action,
            "symbol": symbol,
            "quantity": format(quantity, 'f'),
            "trade_value": str(Decimal(amount_cents) / 100),
            "cash_balance": str(Decimal(new_cash) / 100),
            "shares_owned": format(new_quantity.normalize(), 'f')
        })

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@trading_bp.route("/api/customer/transactions", methods=["GET"])
@role_required("CUSTOMER")
def transaction_history():
    conn = get_db_connection()
    try:
        uid = customer_user_id(conn)
        all_accounts = request.args.get('account_id') == 'all'
        account = None if all_accounts else selected_account(conn, uid)
        if account is None and not all_accounts:
            return jsonify(transactions=[])
        target = None if all_accounts else account['id']

        trades = conn.execute("""
            SELECT
                'stock-' || t.id AS id,
                t.transaction_type AS action,
                ia.id AS account_id, ia.account_name,
                t.quantity,
                t.amount_cents,
                t.created_at,
                a.symbol,
                a.name,
                a.asset_type
            FROM transactions t
            JOIN investment_accounts ia ON t.account_id = ia.id
            LEFT JOIN assets a ON t.asset_id = a.id
            WHERE ia.user_id=? AND (?=1 OR ia.id=?)
        """, (uid,int(all_accounts),target)).fetchall()

        banking = conn.execute("""
            SELECT
                'bank-' || id AS id,
                direction AS action,
                amount_cents,
                created_at,
                bank_code,
                COALESCE(account_id,(SELECT MIN(id) FROM investment_accounts WHERE user_id=?)) AS account_id
            FROM rw_demo_bank_transfers
            WHERE user_id = ? AND (?=1 OR account_id=? OR (account_id IS NULL AND ?=(SELECT MIN(id) FROM investment_accounts WHERE user_id=?)))
        """, (uid,uid,int(all_accounts),target,target,uid)).fetchall()
        account_names = {row['id']: row['account_name'] for row in conn.execute(
            'SELECT id, account_name FROM investment_accounts WHERE user_id=?', (uid,)).fetchall()}

        from access_api import creation_timestamp
        result = []

        for row in trades:
            amount = Decimal(row["amount_cents"]) / 100
            quantity = Decimal(row["quantity"]) if row["quantity"] else None

            result.append({
                "id": row["id"],
                "account_id": row["account_id"],
                "account_name": account_names.get(row["account_id"], "Account"),
                "action": row["action"],
                "symbol": row["symbol"] or "RUSSELL WEALTH",
                "name": row["name"] or "Investment Account",
                "quantity": format(quantity, 'f') if quantity is not None else None,
                "price": str(amount / quantity) if quantity else None,
                "total": str(amount),
                "created_at": creation_timestamp(row["created_at"]),
                "category": row["asset_type"] if row["action"] in ("BUY", "SELL") else "BANK",
                "bank_code": None
            })

        for row in banking:
            result.append({
                "id": row["id"],
                "account_id": row["account_id"],
                "account_name": account_names.get(row["account_id"], "Account"),
                "action": "DEPOSIT" if row["action"] == "DEPOSIT" else "WITHDRAWAL",
                "symbol": row["bank_code"],
                "name": row["bank_code"] + " · Simulated Bank",
                "quantity": None,
                "price": None,
                "total": str(Decimal(row["amount_cents"]) / 100),
                "created_at": creation_timestamp(row["created_at"]),
                "category": "BANK",
                "bank_code": row["bank_code"]
            })

        result.sort(
            key=lambda row: (str(row["created_at"]), str(row["id"])),
            reverse=True
        )

        response = jsonify({"transactions": result})
        response.headers['Cache-Control'] = 'private, no-store'
        return response

    finally:
        conn.close()
