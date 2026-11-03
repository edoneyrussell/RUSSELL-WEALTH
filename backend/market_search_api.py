from flask import Blueprint, jsonify, request
from market_data import request_json, api_key

market_search_bp = Blueprint("market_search", __name__)

@market_search_bp.route("/api/market/search", methods=["GET"])
def search_market():
    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify({"results": []})

    if len(query) > 80:
        return jsonify({"error": "Search query too long"}), 400

    results = {}
    failed = 0

    for endpoint in ("search-symbol", "search-name"):
        try:
            data = request_json(
                f"https://financialmodelingprep.com/stable/{endpoint}",
                {
                    "query": query,
                    "limit": 15,
                    "apikey": api_key("FMP_API_KEY")
                }
            )

            if not isinstance(data, list):
                failed += 1
                continue

            for item in data:
                symbol = item.get("symbol")
                if not symbol:
                    continue

                results[symbol] = {
                    "symbol": symbol,
                    "name": item.get("name", symbol),
                    "exchange": item.get("exchange", ""),
                    "currency": item.get("currency", "")
                }

        except Exception:
            failed += 1

    if failed == 2:
        return jsonify({
            "error": "Market search unavailable from provider"
        }), 503

    return jsonify({
        "results": list(results.values())[:20]
    })
