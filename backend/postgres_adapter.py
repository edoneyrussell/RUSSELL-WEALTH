"""
PostgreSQL adapter for Russell Wealth.

Opt-in only. Does not modify existing SQLite connections.
"""

from postgres_connection import get_connection_pool


class PostgresAdapter:
    def __init__(self):
        self._pool = get_connection_pool()
        self.connection = self._pool.getconn()
        self._released = False

    def execute(self, sql, params=None):
        statement = sql.strip()

        if statement.upper() == "BEGIN IMMEDIATE":
            # PostgreSQL starts a transaction implicitly.
            # This does not provide SQLite's write-lock semantics.
            if self.connection.info.transaction_status.name == "IDLE":
                return self.connection.execute("BEGIN")
            raise RuntimeError("Transaction already active")

        # Translate SQLite parameter placeholders.
        # Literal question marks require separate handling.
        converted = sql.replace("?", "%s")

        return self.connection.execute(
            converted,
            params if params is not None else ()
        )

    def commit(self):
        self.connection.commit()

    def rollback(self):
        self.connection.rollback()

    def close(self):
        if self._released:
            return
        self._released = True
        try:
            # Match close semantics: uncommitted changes must never reach another request.
            if not self.connection.closed:
                self.connection.rollback()
        finally:
            self._pool.putconn(self.connection)


def get_postgres_adapter():
    return PostgresAdapter()
