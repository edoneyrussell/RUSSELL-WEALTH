"""
Russell Wealth PostgreSQL connection.

Separate from the existing SQLite connection.
Does not change the application's database selection.
"""

import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv(
    dotenv_path=Path(__file__).resolve().parent.parent / ".env"
)


def get_postgres_connection():
    url = os.environ.get("DATABASE_URL")

    if not url:
        raise RuntimeError("DATABASE_URL is not configured")

    return psycopg.connect(
        url,
        row_factory=dict_row,
        connect_timeout=10,
    )


if __name__ == "__main__":
    with get_postgres_connection() as conn:
        result = conn.execute(
            "SELECT current_database() AS database_name"
        ).fetchone()

        tables = conn.execute("""
            SELECT COUNT(*) AS total
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
        """).fetchone()

        print("POSTGRESQL CONNECTION SUCCESSFUL")
        print("Database:", result["database_name"])
        print("Tables:", tables["total"])
