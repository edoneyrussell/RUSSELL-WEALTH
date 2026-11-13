"""SOC-only alert review; retains evidence after resolution."""
import json
from flask import Blueprint, jsonify, request, session
from authorization import role_required
from database import get_db_connection

alerts_bp = Blueprint('security_alerts', __name__)


def serialize(row):
    alert = dict(row)
    alert.update(email=alert.get('account_email') or alert.get('event_email') or alert.get('user_email'),
                 user_id=alert.get('user_id'), event_type=alert['alert_type'],
                 details=alert['description'],
                 status='RESOLVED' if alert['status'] == 'DISMISSED' else alert['review_state'])
    alert['evidence'] = json.loads(alert.pop('evidence_json') or '[]')
    alert.pop('dedupe_key', None)
    return alert


SELECT = '''SELECT a.*, e.user_id, e.account_email AS event_email, u.email AS user_email
    FROM security_alerts a LEFT JOIN security_events e ON e.id=a.event_id
    LEFT JOIN users u ON u.id=e.user_id'''


@alerts_bp.get('/api/security/alerts')
@role_required('SOC_ADMIN')
def alerts():
    try:
        page = max(1, int(request.args.get('page', 1)))
        size = min(100, max(1, int(request.args.get('per_page', 25))))
    except (ValueError, TypeError):
        return jsonify(success=False, error='Invalid pagination'), 400
    clauses, params = [], []
    severity = request.args.get('severity', '').upper()
    state = request.args.get('status', '')
    if severity:
        clauses.append('a.severity=?'); params.append(severity)
    if state:
        if state not in ('NEW', 'UNDER_REVIEW', 'RESOLVED'):
            return jsonify(success=False, error='Invalid status'), 400
        clauses.append("a.status='DISMISSED'" if state == 'RESOLVED' else "a.status='ACTIVE' AND a.review_state=?")
        if state != 'RESOLVED': params.append(state)
    where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
    db = get_db_connection()
    try:
        total = db.execute('SELECT COUNT(*) AS n FROM security_alerts a' + where, params).fetchone()['n']
        active = db.execute("SELECT COUNT(*) AS n FROM security_alerts WHERE status='ACTIVE'").fetchone()['n']
        rows = db.execute(SELECT + where + ' ORDER BY a.id DESC LIMIT ? OFFSET ?',
                          params + [size, (page-1)*size]).fetchall()
        response = jsonify(success=True, logs=[serialize(r) for r in rows], active_count=active,
                           pagination=dict(page=page, per_page=size, total=total, total_pages=max(1,(total+size-1)//size)))
        response.headers['Cache-Control'] = 'no-store'
        return response
    finally:
        db.close()


@alerts_bp.get('/api/security/active-alerts')
@role_required('SOC_ADMIN')
def active_alerts():
    db = get_db_connection()
    try:
        count = db.execute("SELECT COUNT(*) AS n FROM security_alerts WHERE status='ACTIVE'").fetchone()['n']
        rows = db.execute(SELECT + " WHERE a.status='ACTIVE' ORDER BY a.id DESC LIMIT 100").fetchall()
        response = jsonify(success=True, count=count, alerts=[serialize(r) for r in rows])
        response.headers['Cache-Control'] = 'no-store'
        return response
    finally:
        db.close()


@alerts_bp.patch('/api/security/alerts/<int:alert_id>')
@role_required('SOC_ADMIN')
def review_alert(alert_id):
    payload = request.get_json(silent=True)
    state = payload.get('status') if isinstance(payload, dict) else None
    if state not in ('NEW', 'UNDER_REVIEW', 'RESOLVED'):
        return jsonify(success=False, error='Choose New, Under review, or Resolved'), 400
    db = get_db_connection()
    try:
        result = db.execute('''UPDATE security_alerts SET review_state=?,status=?,
            dismissed_at=CASE WHEN ?='RESOLVED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?''',
            (state,'DISMISSED' if state == 'RESOLVED' else 'ACTIVE',state,alert_id))
        db.commit()
        if not result.rowcount:
            return jsonify(success=False, error='Alert not found'), 404
    finally:
        db.close()
    from security import log_security_event
    log_security_event(session['user_id'], 'ALERT_STATUS_CHANGED', request.remote_addr, 'INFO',
                       f'Alert {alert_id} marked {state}')
    return jsonify(success=True, status=state)


@alerts_bp.post('/api/security/clear-alerts')
@role_required('SOC_ADMIN')
def clear_alerts():
    db = get_db_connection()
    try:
        cursor = db.execute("""UPDATE security_alerts SET status='DISMISSED',review_state='RESOLVED',
                             dismissed_at=CURRENT_TIMESTAMP WHERE status='ACTIVE'""")
        db.commit()
        count = cursor.rowcount
    finally:
        db.close()
    from security import log_security_event
    log_security_event(session['user_id'], 'ALERTS_RESOLVED', request.remote_addr, 'INFO', f'Resolved {count} active alerts')
    return jsonify(success=True, cleared=count)
