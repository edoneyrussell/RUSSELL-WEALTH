from pathlib import Path
import os
import sqlite3

DATABASE = str(Path(__file__).resolve().parent.parent / "russellwealth.db")


def get_db_connection():
    engine = os.environ.get("RW_DB_ENGINE", "sqlite").lower()

    if engine == "postgres":
        from postgres_adapter import get_postgres_adapter
        return get_postgres_adapter()

    if engine != "sqlite":
        raise ValueError(f"Unsupported database engine: {engine}")

    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def create_database():
    connection = get_db_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            account_status TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS security_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            event_type TEXT NOT NULL,
            source_ip TEXT,
            severity TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    connection.commit()
    connection.close()


if __name__ == "__main__":
    create_database()
    print("RUSSELL WEALTH database created.")