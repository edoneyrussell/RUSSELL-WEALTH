"""Customer-owned simulated accounts with isolated cash, holdings and selection."""
from decimal import Decimal, InvalidOperation
from flask import Blueprint, jsonify, request
from authorization import role_required
from account_access import customer_user_id
from database import get_db_connection
from account_limits import MAX_ACCOUNT_CENTS, invested_cents
from access_api import valid_origin

accounts_bp = Blueprint('customer_accounts', __name__)

# These are simulation labels, not registrations, tax filings or bank products.
SELF = 'SELF_DIRECTED'
MANAGED = 'MANAGED'
SAVINGS = 'SAVINGS'
ACCOUNT_TYPES = [
    ('TFSA', 'TFSA', 'Tax-Free Savings Account', [SELF, MANAGED, SAVINGS], 'Registered'),
    ('RRSP', 'RRSP', 'Registered Retirement Savings Plan', [SELF, MANAGED, SAVINGS], 'Registered'),
    ('SPOUSAL_RRSP', 'Spousal RRSP', 'Retirement savings in a spouse’s name', [SELF, MANAGED], 'Registered'),
    ('FHSA', 'FHSA', 'First Home Savings Account', [SELF, MANAGED, SAVINGS], 'Registered'),
    ('RESP', 'RESP', 'Registered Education Savings Plan', [SELF, MANAGED], 'Registered'),
    ('LIRA', 'LIRA', 'Locked-In Retirement Account', [SELF, MANAGED], 'Registered'),
    ('RRIF', 'RRIF', 'Registered Retirement Income Fund', [SELF, MANAGED], 'Registered'),
    ('PERSONAL', 'Personal', 'Non-registered individual investing', [SELF, MANAGED], 'Investing'),
    ('JOINT', 'Joint', 'Non-registered joint investing', [SELF, MANAGED], 'Investing'),
    ('CRYPTO', 'Crypto', 'Dedicated cryptocurrency trading', [SELF], 'Investing'),
    ('MARGIN', 'Margin', 'Self-directed investing; borrowing is not enabled in this simulation', [SELF], 'Investing'),
    ('CHEQUING', 'Chequing', 'Individual everyday cash account', [SAVINGS], 'Banking'),
    ('JOINT_CHEQUING', 'Joint Chequing', 'Joint everyday cash account', [SAVINGS], 'Banking'),
    ('SAVINGS', 'Savings', 'Everyday savings account', [SAVINGS], 'Banking'),
    ('BUSINESS_CHEQUING', 'Business Chequing', 'Company cash account', [SAVINGS], 'Business'),
    ('CORPORATE', 'Corporate Investing', 'Investment account for incorporated business funds', [SELF, MANAGED, SAVINGS], 'Business'),
]
TYPE_MAP = {item[0]: item for item in ACCOUNT_TYPES}


class AccountError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def initialize_customer_accounts():
    db = get_db_connection()
    try:
        postgres = hasattr(db, 'connection')
        columns = {row['name'] for row in db.execute(
            "SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='investment_accounts'"
            if postgres else 'PRAGMA table_info(investment_accounts)').fetchall()}
        for name, definition in [('account_type', "TEXT NOT NULL DEFAULT 'PERSONAL'"), ('management_mode', "TEXT NOT NULL DEFAULT 'SELF_DIRECTED'"), ('status', "TEXT NOT NULL DEFAULT 'OPEN'")]:
            if name not in columns:
                db.execute(f'ALTER TABLE investment_accounts ADD COLUMN {"IF NOT EXISTS " if postgres else ""}{name} {definition}')
        db.execute('''CREATE TABLE IF NOT EXISTS customer_account_selection (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE)''')
        db.execute('''CREATE TABLE IF NOT EXISTS customer_account_transfers (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            request_id TEXT NOT NULL,
            from_account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
            to_account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
            amount_cents BIGINT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, request_id))''')
        # Keep existing bank transfer history attached to its original first account.
        bank_columns = {row['name'] for row in db.execute(
            "SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='rw_demo_bank_transfers'"
            if postgres else 'PRAGMA table_info(rw_demo_bank_transfers)').fetchall()}
        if bank_columns and 'account_id' not in bank_columns:
            db.execute(f'ALTER TABLE rw_demo_bank_transfers ADD COLUMN {"IF NOT EXISTS " if postgres else ""}account_id BIGINT')
            db.execute('''UPDATE rw_demo_bank_transfers SET account_id=(
                SELECT MIN(id) FROM investment_accounts WHERE user_id=rw_demo_bank_transfers.user_id)
                WHERE account_id IS NULL''')
        db.commit()
    finally:
        db.close()


def account_id(value):
    if isinstance(value, bool) or not str(value).isdigit() or int(value) <= 0:
        raise AccountError('Choose a valid account.')
    return int(value)


def selected_account(db, uid=None, requested=None, lock=False):
    uid = uid if uid is not None else customer_user_id(db)
    if requested is None:
        requested = request.args.get('account_id')
    if requested is not None:
        target = account_id(requested)
    else:
        selection = db.execute('SELECT account_id FROM customer_account_selection WHERE user_id=?', (uid,)).fetchone()
        target = selection['account_id'] if selection else None
    query = "SELECT * FROM investment_accounts WHERE user_id=? AND status='OPEN'"
    params = [uid]
    if target is not None:
        query += ' AND id=?'
        params.append(target)
    query += ' ORDER BY id LIMIT 1'
    if lock and hasattr(db, 'connection'):
        query += ' FOR UPDATE'
    row = db.execute(query, tuple(params)).fetchone()
    if target is not None and row is None:
        raise AccountError('This account is unavailable.', 404)
    return row


def money(cents):
    return str(Decimal(cents) / 100)


def serialize(db, row, invested=None):
    invested = invested_cents(db, row['id']) if invested is None else invested
    return dict(id=row['id'], name=row['account_name'], account_type=row['account_type'],
                management_mode=row['management_mode'], status=row['status'], currency='CAD',
                cash_balance=money(row['cash_balance_cents']), invested_value=money(invested),
                total_value=money(Decimal(row['cash_balance_cents']) + invested))


@accounts_bp.after_request
def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response


@accounts_bp.get('/api/customer/accounts')
@role_required('CUSTOMER')
def list_accounts():
    db = get_db_connection()
    try:
        uid = customer_user_id(db)
        rows = db.execute('SELECT * FROM investment_accounts WHERE user_id=? ORDER BY id', (uid,)).fetchall()
        current = selected_account(db, uid)
        # Value the current holdings once for all accounts, with the same pricing
        # function used by order validation. Never cache cash or holdings.
        import simulation_prices
        values={}
        positions=db.execute("""SELECT h.account_id,h.quantity,a.symbol,a.asset_type,a.price_cents
            FROM holdings h JOIN assets a ON a.id=h.asset_id
            JOIN investment_accounts ia ON ia.id=h.account_id WHERE ia.user_id=?""",(uid,)).fetchall()
        for position in positions:
            target=position['account_id']
            values[target]=values.get(target,Decimal(0))+Decimal(position['quantity'])*simulation_prices.stock_price_cents(position['symbol'],position['asset_type'],position['price_cents'])
        accounts = [serialize(db,row,values.get(row['id'],Decimal(0))) for row in rows]
        return jsonify(accounts=accounts, selected_account_id=current['id'] if current else None,
                       total_value=str(sum((Decimal(row['total_value']) for row in accounts), Decimal(0))),
                       types=[dict(code=code, name=name, description=description, modes=modes, category=category)
                              for code, name, description, modes, category in ACCOUNT_TYPES])
    finally:
        db.close()


def body_and_origin():
    if not valid_origin():
        raise AccountError('Request origin denied', 403)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise AccountError('Invalid request.')
    return data


def lock_customer(db, uid):
    db.execute('BEGIN IMMEDIATE')
    if hasattr(db, 'connection'):
        db.execute('SELECT id FROM users WHERE id=? FOR UPDATE', (uid,)).fetchone()


@accounts_bp.post('/api/customer/accounts')
@role_required('CUSTOMER')
def open_account():
    data = body_and_origin()
    kind = TYPE_MAP.get(data.get('account_type'))
    if kind is None or data.get('management_mode', SELF) not in kind[3]:
        raise AccountError('Choose a valid account type and management option.')
    name = data.get('name') or kind[1]
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
        raise AccountError('Account names must contain 1–80 characters.')
    db = get_db_connection()
    try:
        uid = customer_user_id(db)
        # customer_user_id may SELECT a link; finish that read before the write lock.
        db.commit()
        lock_customer(db, uid)
        if db.execute("SELECT COUNT(*) AS n FROM investment_accounts WHERE user_id=? AND status='OPEN'", (uid,)).fetchone()['n'] >= 50:
            raise AccountError('You can have up to 50 open accounts.')
        row = db.execute('''INSERT INTO investment_accounts
            (user_id,account_name,cash_balance_cents,account_type,management_mode)
            VALUES(?,?,0,?,?) RETURNING *''', (uid, name.strip(), kind[0], data.get('management_mode', SELF))).fetchone()
        db.commit()
        return jsonify(account=serialize(db, row)), 201
    finally:
        db.close()


@accounts_bp.put('/api/customer/accounts/selection')
@role_required('CUSTOMER')
def select_account():
    data = body_and_origin()
    db = get_db_connection()
    try:
        uid = customer_user_id(db)
        db.commit()
        lock_customer(db, uid)
        row = selected_account(db, uid, data.get('account_id'), lock=True)
        if row is None:
            raise AccountError('Account unavailable.', 404)
        db.execute('''INSERT INTO customer_account_selection(user_id,account_id) VALUES(?,?)
            ON CONFLICT(user_id) DO UPDATE SET account_id=excluded.account_id''', (uid, row['id']))
        db.commit()
        return jsonify(selected_account_id=row['id'])
    finally:
        db.close()


@accounts_bp.patch('/api/customer/accounts/<int:target>')
@role_required('CUSTOMER')
def manage_account(target):
    data = body_and_origin()
    db = get_db_connection()
    try:
        uid = customer_user_id(db)
        db.commit()
        lock_customer(db, uid)
        query = 'SELECT * FROM investment_accounts WHERE id=? AND user_id=?'
        if hasattr(db, 'connection'):
            query += ' FOR UPDATE'
        row = db.execute(query, (target, uid)).fetchone()
        if row is None:
            raise AccountError('Account unavailable.', 404)
        name = data.get('name', row['account_name'])
        status = data.get('status', row['status'])
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80 or status not in ('OPEN', 'CLOSED'):
            raise AccountError('Choose a valid name and status.')
        if status == 'CLOSED':
            holdings = db.execute('SELECT quantity FROM holdings WHERE account_id=?', (target,)).fetchall()
            if row['cash_balance_cents'] or any(Decimal(h['quantity']) > 0 for h in holdings):
                raise AccountError('Move all cash and holdings out before closing this account.')
            if db.execute("SELECT COUNT(*) AS n FROM investment_accounts WHERE user_id=? AND status='OPEN' AND id<>?", (uid,target)).fetchone()['n'] == 0:
                raise AccountError('Keep at least one account open.')
            db.execute('DELETE FROM customer_account_selection WHERE user_id=? AND account_id=?', (uid,target))
        db.execute('UPDATE investment_accounts SET account_name=?, status=? WHERE id=? AND user_id=?', (name.strip(),status,target,uid))
        db.commit()
        return jsonify(success=True)
    finally:
        db.close()


@accounts_bp.post('/api/customer/accounts/transfer')
@role_required('CUSTOMER')
def transfer_cash():
    data = body_and_origin()
    source, destination = account_id(data.get('from_account_id')), account_id(data.get('to_account_id'))
    if source == destination:
        raise AccountError('Choose two different accounts.')
    request_id = data.get('request_id')
    if not isinstance(request_id, str) or not 8 <= len(request_id) <= 100:
        raise AccountError('A transfer request ID is required.')
    try:
        amount = Decimal(str(data.get('amount')))
        if not amount.is_finite() or amount <= 0 or amount * 100 != (amount * 100).to_integral_value() or amount > 900000000:
            raise ValueError()
        cents = int(amount * 100)
    except (InvalidOperation, ValueError):
        raise AccountError('Enter a positive CAD amount with at most two decimals.')
    db = get_db_connection()
    try:
        uid = customer_user_id(db)
        db.commit()
        lock_customer(db, uid)
        # Lock both accounts in ID order, matching concurrent transfers/closures.
        locked = {target: selected_account(db, uid, target, lock=True) for target in sorted((source,destination))}
        previous = db.execute('SELECT * FROM customer_account_transfers WHERE user_id=? AND request_id=?', (uid,request_id)).fetchone()
        if previous:
            if (previous['from_account_id'],previous['to_account_id'],previous['amount_cents']) != (source,destination,cents):
                raise AccountError('This request ID was already used for a different transfer.',409)
            return jsonify(success=True, already_completed=True)
        if locked[source]['cash_balance_cents'] < cents:
            raise AccountError('Insufficient available cash.',409)
        if locked[destination]['cash_balance_cents'] + cents + invested_cents(db,destination) > MAX_ACCOUNT_CENTS:
            raise AccountError('The destination account cannot exceed CA$900 million through transfers.')
        db.execute('UPDATE investment_accounts SET cash_balance_cents=cash_balance_cents-? WHERE id=?', (cents,source))
        db.execute('UPDATE investment_accounts SET cash_balance_cents=cash_balance_cents+? WHERE id=?', (cents,destination))
        db.execute('INSERT INTO customer_account_transfers(user_id,request_id,from_account_id,to_account_id,amount_cents) VALUES(?,?,?,?,?)', (uid,request_id,source,destination,cents))
        for target, action in ((source,'WITHDRAWAL'), (destination,'DEPOSIT')):
            db.execute('INSERT INTO transactions(account_id,transaction_type,amount_cents) VALUES(?,?,?)', (target,action,cents))
        db.commit()
        return jsonify(success=True)
    finally:
        db.close()
