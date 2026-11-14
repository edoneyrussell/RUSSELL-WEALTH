import simulation_prices
from flask import Blueprint, jsonify, request
from market_data import get_quote, get_history

market_bp = Blueprint("market", __name__)

@market_bp.route("/api/market/quote", methods=["GET"])
def market_quote():
    symbol = request.args.get("symbol", "").strip().upper()

    if not symbol:
        return jsonify({"error": "Symbol required"}), 400

    try:
        return jsonify(simulation_prices.stock_quote(symbol) or get_quote(symbol))
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
        quote = simulation_prices.stock_quote(symbol)
        history = simulation_prices.stock_history(symbol) if quote else get_history(symbol)
        return jsonify({
            "symbol": symbol,
            "history": history,
            "price_type": "SIMULATED" if quote else "MARKET",
            "currency": quote["currency"] if quote else get_quote(symbol).get("currency", "CAD"),
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception:
        return jsonify({"error": "Historical data unavailable"}), 503

@market_bp.after_request
def fresh_simulations(response):
    response.headers['Cache-Control'] = 'no-store'
    return response
