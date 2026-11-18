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


# One bounded lazy pool per worker process. Zero minimum means idle development
# sessions do not keep Neon awake. Direct script connections above remain direct.
import atexit
import threading
from contextlib import contextmanager

_pool = None
_pool_identity = None
_pool_lock = threading.Lock()


def get_connection_pool():
    global _pool, _pool_identity
    from psycopg_pool import ConnectionPool
    url = os.environ.get('DATABASE_URL')
    if not url:
        raise RuntimeError('DATABASE_URL is not configured')
    identity = (os.getpid(), url)
    with _pool_lock:
        if _pool is None or identity != _pool_identity:
            # Never reuse a parent's connections after Gunicorn forks.
            if _pool is not None and _pool_identity[0] == os.getpid():
                _pool.close()
            _pool = ConnectionPool(url, min_size=0, max_size=4, timeout=10,
                max_idle=60, max_lifetime=1800, reconnect_timeout=10,
                kwargs={'row_factory':dict_row, 'connect_timeout':10, 'prepare_threshold':None},
                name='russell-wealth', open=True)
            _pool_identity = identity
        return _pool


def close_connection_pool():
    global _pool, _pool_identity
    if _pool is not None and _pool_identity[0] == os.getpid():
        _pool.close()
    _pool = None
    _pool_identity = None


atexit.register(close_connection_pool)


@contextmanager
def pooled_connection():
    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)
