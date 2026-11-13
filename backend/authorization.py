from functools import wraps
from flask import session, jsonify, request


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

            if not set(session.get("roles", [session.get("role")])).intersection(allowed_roles):
                if "SOC_ADMIN" in allowed_roles:
                    from security import log_security_event
                    log_security_event(session["user_id"], "SOC_ACCESS_DENIED", request.remote_addr,
                                       "WARNING", f"Denied {request.method} {request.path}")
                return jsonify({"error": "Access denied"}), 403

            return f(*args, **kwargs)

        return decorated

    return decorator
