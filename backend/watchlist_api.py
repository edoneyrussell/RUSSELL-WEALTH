"""Private, account-owned watchlists shared across devices."""
import re
from flask import Blueprint, jsonify, request
from authorization import role_required
from account_access import customer_user_id
from database import get_db_connection
from trade_catalog import stock_catalog

watchlist_bp = Blueprint('watchlist', __name__)


def initialize_watchlist():
    db = get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS customer_watchlist(
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL, PRIMARY KEY(user_id,symbol))''')
        db.commit()
    finally:
        db.close()


def selections(db, uid):
    symbols = [row['symbol'] for row in db.execute('SELECT symbol FROM customer_watchlist WHERE user_id=? ORDER BY symbol',(uid,)).fetchall()]
    catalog = stock_catalog()
    return dict(symbols=symbols, items=[dict(symbol=symbol,name=catalog.get(symbol,{}).get('name',symbol)) for symbol in symbols])


@watchlist_bp.after_request
def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response


@watchlist_bp.get('/api/customer/watchlist')
@role_required('CUSTOMER')
def get_watchlist():
    db = get_db_connection()
    try:
        return jsonify(selections(db,customer_user_id(db)))
    finally:
        db.close()


@watchlist_bp.route('/api/customer/watchlist/<symbol>',methods=['PUT','DELETE'])
@role_required('CUSTOMER')
def change_watchlist(symbol):
    from access_api import valid_origin
    if not valid_origin():
        return jsonify(error='Request origin denied'),403
    symbol = symbol.strip().upper()
    if not re.fullmatch(r'[A-Z0-9.^-]{1,32}',symbol):
        return jsonify(error='Choose a valid asset symbol'),400
    db = get_db_connection()
    try:
        db.execute('BEGIN IMMEDIATE')
        uid = customer_user_id(db)
        if hasattr(db,'connection'):
            db.execute('SELECT id FROM users WHERE id=? FOR UPDATE',(uid,)).fetchone()
        if request.method == 'PUT':
            count = db.execute('SELECT COUNT(*) AS n FROM customer_watchlist WHERE user_id=?',(uid,)).fetchone()['n']
            exists = db.execute('SELECT 1 FROM customer_watchlist WHERE user_id=? AND symbol=?',(uid,symbol)).fetchone()
            if count >= 100 and not exists:
                return jsonify(error='Your watchlist can contain up to 100 assets'),400
            db.execute('INSERT INTO customer_watchlist(user_id,symbol) VALUES(?,?) ON CONFLICT DO NOTHING',(uid,symbol))
        else:
            db.execute('DELETE FROM customer_watchlist WHERE user_id=? AND symbol=?',(uid,symbol))
        result = selections(db,uid)
        db.commit()
        return jsonify(result)
    finally:
        db.close()
