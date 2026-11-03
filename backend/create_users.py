from werkzeug.security import generate_password_hash
from database import get_db_connection

connection = get_db_connection()

customer_password = generate_password_hash("Customer123!")
admin_password = generate_password_hash("Admin123!")

connection.execute("""
    INSERT OR IGNORE INTO users
    (name, email, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, ?)
""", (
    "Edoney Russell",
    "customer@russellwealth.local",
    customer_password,
    "CUSTOMER",
    "ACTIVE"
))

connection.execute("""
    INSERT OR IGNORE INTO users
    (name, email, password_hash, role, account_status)
    VALUES (?, ?, ?, ?, ?)
""", (
    "Edoney Russell",
    "soc@russellwealth.local",
    admin_password,
    "SOC_ADMIN",
    "ACTIVE"
))

connection.commit()
connection.close()

print("RUSSELL WEALTH users created.")