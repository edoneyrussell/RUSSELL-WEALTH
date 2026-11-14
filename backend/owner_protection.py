"""Enforce the owner's customer/SOC access at the database boundary."""
import os
from database import get_db_connection

OWNER_EMAIL = 'edoneyrussell@gmail.com'


def initialize_owner_protection():
    db = get_db_connection()
    try:
        # Restore explicit customer membership without depending on numeric user IDs.
        db.execute('''INSERT INTO admin_customer_links(admin_user_id,customer_user_id)
            SELECT id,id FROM users WHERE lower(email)=? AND role='SOC_ADMIN'
            ON CONFLICT DO NOTHING''', (OWNER_EMAIL,))
        if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres':
            db.execute('''CREATE OR REPLACE FUNCTION rw_protect_owner() RETURNS trigger AS $$
            BEGIN
                IF lower(OLD.email) = 'edoneyrussell@gmail.com' THEN
                    IF TG_OP = 'DELETE' THEN
                        RAISE EXCEPTION 'The owner account is protected';
                    END IF;
                    IF NEW.role <> 'SOC_ADMIN' OR NEW.account_status <> 'ACTIVE' OR lower(NEW.email) <> lower(OLD.email) THEN
                        RAISE EXCEPTION 'The owner account access is protected';
                    END IF;
                END IF;
                IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END; $$ LANGUAGE plpgsql''')
            db.execute('DROP TRIGGER IF EXISTS rw_owner_access_guard ON users')
            db.execute('''CREATE TRIGGER rw_owner_access_guard BEFORE UPDATE OR DELETE ON users
                FOR EACH ROW EXECUTE FUNCTION rw_protect_owner()''')
            db.execute('''CREATE OR REPLACE FUNCTION rw_protect_owner_link() RETURNS trigger AS $$
            BEGIN
                IF EXISTS (SELECT 1 FROM users WHERE id=OLD.admin_user_id AND lower(email)='edoneyrussell@gmail.com') THEN
                    RAISE EXCEPTION 'The owner customer access is protected';
                END IF;
                IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
                RETURN OLD;
            END; $$ LANGUAGE plpgsql''')
            db.execute('DROP TRIGGER IF EXISTS rw_owner_customer_guard ON admin_customer_links')
            db.execute('''CREATE TRIGGER rw_owner_customer_guard BEFORE DELETE OR UPDATE ON admin_customer_links
                FOR EACH ROW EXECUTE FUNCTION rw_protect_owner_link()''')
        else:
            db.execute('''CREATE TRIGGER IF NOT EXISTS rw_owner_delete_guard BEFORE DELETE ON users
                WHEN lower(OLD.email)='edoneyrussell@gmail.com'
                BEGIN SELECT RAISE(ABORT, 'The owner account is protected'); END''')
            db.execute('''CREATE TRIGGER IF NOT EXISTS rw_owner_access_guard BEFORE UPDATE ON users
                WHEN lower(OLD.email)='edoneyrussell@gmail.com' AND
                (NEW.role<>'SOC_ADMIN' OR NEW.account_status<>'ACTIVE' OR lower(NEW.email)<>lower(OLD.email))
                BEGIN SELECT RAISE(ABORT, 'The owner account access is protected'); END''')
            for operation in ('DELETE', 'UPDATE'):
                db.execute(f'''CREATE TRIGGER IF NOT EXISTS rw_owner_customer_{operation.lower()}_guard BEFORE {operation} ON admin_customer_links
                    WHEN EXISTS(SELECT 1 FROM users WHERE id=OLD.admin_user_id AND lower(email)='edoneyrussell@gmail.com')
                    BEGIN SELECT RAISE(ABORT, 'The owner customer access is protected'); END''')
        db.commit()
    finally:
        db.close()
