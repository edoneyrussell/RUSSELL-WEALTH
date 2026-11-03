from functools import wraps
from flask import session, jsonify


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required"}), 401

        return f(*args, **kwargs)

    return decorated


def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not session.get("user_id"):
                return jsonify({"error": "Authentication required"}), 401

            if session.get("role") not in allowed_roles:
                return jsonify({"error": "Access denied"}), 403

            return f(*args, **kwargs)

        return decorated

    return decorator
