"""Optional account reminders; never used as authentication credentials."""
import os
from database import get_db_connection


def initialize_password_hint_schema():
    db = get_db_connection()
    try:
        if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres':
            db.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hint TEXT')
        elif 'password_hint' not in {row['name'] for row in db.execute('PRAGMA table_info(users)')}:
            db.execute('ALTER TABLE users ADD COLUMN password_hint TEXT')
        db.commit()
    finally:
        db.close()
