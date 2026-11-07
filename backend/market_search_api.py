from flask import Blueprint, jsonify, request
from database import get_db_connection
import os
from market_data import api_key, request_json

market_search_bp = Blueprint("market_search", __name__)


@market_search_bp.route("/api/market/search", methods=["GET"])
def search_market():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"results": [], "count": 0})

    if len(query) > 80:
        return jsonify({"error": "Search query too long"}), 400

    results = {}
    q = query.upper()

    # Search existing database securities first.
    conn = get_db_connection()
    try:
        postgres = os.environ.get("RW_DB_ENGINE", "sqlite").lower() == "postgres"
        search_sql = """
            SELECT symbol, name, currency, asset_type
            FROM assets
            WHERE symbol ILIKE ?
               OR name ILIKE ?
            LIMIT 50
        """
        if not postgres:
            search_sql = search_sql.replace("ILIKE", "LIKE")
        rows = conn.execute(
            search_sql, (f"{query}%", f"{query}%")
        ).fetchall()

        for row in rows:
            symbol = row["symbol"].upper()
            results[symbol] = {
                "symbol": symbol,
                "name": row["name"],
                "currency": row["currency"],
                "exchange": "",
                "type": row["asset_type"]
            }
    finally:
        conn.close()

    # Search the external stock market.
    try:
        data = request_json(
            "https://financialmodelingprep.com/stable/search-symbol",
            {
                "query": query,
                "limit": 100,
                "apikey": api_key("FMP_API_KEY")
            }
        )

        if isinstance(data, list):
            for item in data:
                symbol = str(item.get("symbol", "")).upper().strip()
                name = str(item.get("name", symbol)).strip()

                if not symbol or not name:
                    continue

                if not (
                    symbol.startswith(q)
                    or name.upper().startswith(q)
                ):
                    continue

                exchange = str(
                    item.get("exchangeShortName")
                    or item.get("exchange")
                    or ""
                )

                results.setdefault(symbol, {
                    "symbol": symbol,
                    "name": name,
                    "exchange": exchange,
                    "currency": item.get("currency") or (
                        "CAD" if symbol.endswith(".TO") else "USD"
                    ),
                    "type": "STOCK"
                })

    except Exception:
        pass

    ordered = sorted(
        results.values(),
        key=lambda item: (
            0 if item["symbol"] == q else
            1 if item["symbol"].startswith(q) else
            2,
            item["symbol"]
        )
    )[:20]

    return jsonify({
        "results": ordered,
        "count": len(ordered),
        "source": "market_search"
    })


@market_search_bp.route("/api/market/search-prices", methods=["GET"])
def search_market_prices():
    symbols = [
        s.strip().upper()
        for s in request.args.get("symbols", "").split(",")
        if s.strip()
    ][:20]

    if not symbols:
        return jsonify({"prices": {}})

    prices = {}

    try:
        data = request_json(
            "https://financialmodelingprep.com/stable/batch-quote",
            {
                "symbols": ",".join(symbols),
                "apikey": api_key("FMP_API_KEY"),
            }
        )

        if isinstance(data, list):
            for item in data:
                symbol = str(item.get("symbol", "")).upper()
                price = item.get("price")

                if symbol in symbols and isinstance(price, (int, float)) and price > 0:
                    prices[symbol] = {
                        "price": price,
                        "currency": item.get("currency") or (
                            "CAD" if symbol.endswith(".TO") else "USD"
                        ),
                    }
    except Exception:
        pass

    return jsonify({"prices": prices})
