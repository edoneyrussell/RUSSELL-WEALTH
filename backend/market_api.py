from flask import Blueprint, jsonify, request
from market_data import get_quote, get_history

market_bp = Blueprint("market", __name__)

@market_bp.route("/api/market/quote", methods=["GET"])
def market_quote():
    symbol = request.args.get("symbol", "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol required"}), 400

    try:
        return jsonify(get_quote(symbol))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception:
        return jsonify({"error": "Market quote unavailable"}), 503


@market_bp.route("/api/market/history", methods=["GET"])
def market_history():
    symbol = request.args.get("symbol", "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol required"}), 400

    try:
        return jsonify({
            "symbol": symbol,
            "history": get_history(symbol)
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception:
        return jsonify({"error": "Historical data unavailable"}), 503
