"""Funding limits preserve existing holdings rather than truncating balances."""
from decimal import Decimal
import simulation_prices
MAX_ACCOUNT_CENTS = 900_000_000 * 100


def invested_cents(db, account_id):
    return sum((Decimal(row['quantity']) * simulation_prices.stock_price_cents(row['symbol'],row['asset_type'],row['price_cents']) for row in db.execute('''SELECT h.quantity,a.symbol,a.asset_type,a.price_cents FROM holdings h
        JOIN assets a ON a.id=h.asset_id WHERE h.account_id=?''',(account_id,)).fetchall()),Decimal(0))


def initialize_account_limits():
    import os
    if os.environ.get('RW_DB_ENGINE','sqlite').lower()!='postgres':
        return
    from database import get_db_connection
    db=get_db_connection()
    try:
        for table,column in [('investment_accounts','cash_balance_cents'),('transactions','amount_cents'),('rw_demo_bank_accounts','balance_cents'),('rw_demo_bank_transfers','amount_cents')]:
            row=db.execute('''SELECT data_type FROM information_schema.columns
                WHERE table_schema=current_schema() AND table_name=? AND column_name=?''',(table,column)).fetchone()
            if row and row['data_type']=='integer':
                db.execute(f'ALTER TABLE {table} ALTER COLUMN {column} TYPE BIGINT')
        db.commit()
    finally:
        db.close()
