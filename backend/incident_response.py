"""Incident investigations and transactional, explicitly authorized response actions."""
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash
from authorization import role_required
from database import get_db_connection
from access_api import creation_timestamp, valid_origin, is_owner
import access_api
from roles import account_roles

incident_response_bp = Blueprint('incident_response', __name__)


def initialize_incident_response():
    db = get_db_connection()
    try:
        primary = 'BIGSERIAL PRIMARY KEY' if hasattr(db, 'connection') else 'INTEGER PRIMARY KEY AUTOINCREMENT'
        # Preserve the response record even if an account is subsequently removed.
        db.execute(f'''CREATE TABLE IF NOT EXISTS incident_response_actions (
            id {primary}, incident_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
            actor_name TEXT NOT NULL, actor_email TEXT NOT NULL,
            target_user_id BIGINT, target_email TEXT, action TEXT NOT NULL,
            outcome TEXT NOT NULL, reason TEXT NOT NULL, details TEXT NOT NULL,
            request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, http_status INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(actor_id, request_id))''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_incident_response_time ON incident_response_actions(incident_id, created_at)')
        db.commit()
    finally:
        db.close()


@incident_response_bp.after_request
def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response


def incident_window(incident):
    start = datetime.fromisoformat(creation_timestamp(incident['created_at']).replace('Z', '+00:00')) - timedelta(minutes=5)
    end = creation_timestamp(incident['resolved_at']) or datetime.now(timezone.utc).isoformat()
    return start.isoformat(), end


def time_clause(db, column):
    return f"CAST({column} AS timestamp) BETWEEN CAST(? AS timestamp) AND CAST(? AS timestamp)" if hasattr(db, 'connection') else f"datetime({column}) BETWEEN datetime(?) AND datetime(?)"


def related_accounts(db, incident):
    start, end = incident_window(incident)
    # An account must have recorded evidence tied to this incident's source and time.
    # Never infer an account from an IP outside the investigation window.
    return db.execute(f'''SELECT DISTINCT u.id,u.name,u.email,u.role,u.account_status
        FROM users u JOIN security_events e ON
            (e.user_id=u.id OR (e.user_id IS NULL AND lower(e.account_email)=lower(u.email)))
        WHERE e.source_ip=? AND {time_clause(db, 'e.created_at')}
        ORDER BY u.id LIMIT 100''', (incident['source_ip'], start, end)).fetchall()


def protection(db, target, actor_id):
    if is_owner(target['email']):
        return 'The owner account is protected.'
    if target['id'] == actor_id:
        return 'You cannot contain your own account from this panel.'
    if target['role'] == 'SOC_ADMIN' and target['account_status'] == 'ACTIVE':
        count = db.execute("SELECT COUNT(*) AS n FROM users WHERE role='SOC_ADMIN' AND account_status='ACTIVE'").fetchone()['n']
        if count <= 1:
            return 'The last active SOC administrator is protected.'
    return None


@incident_response_bp.get('/api/security/incidents/<int:incident_id>/investigation')
@role_required('SOC_ADMIN')
def investigation(incident_id):
    db = get_db_connection()
    try:
        incident = db.execute('SELECT * FROM security_incidents WHERE id=?', (incident_id,)).fetchone()
        if incident is None:
            return jsonify(error='Incident not found'), 404
        start, end = incident_window(incident)
        accounts = related_accounts(db, incident)
        clauses = ['e.source_ip=?']
        params = [incident['source_ip']]
        if accounts:
            marks = ','.join('?' for _ in accounts)
            clauses.extend([f'e.user_id IN ({marks})', f'lower(e.account_email) IN ({marks})'])
            params.extend(row['id'] for row in accounts)
            params.extend(row['email'].lower() for row in accounts)
        events = db.execute(f'''SELECT e.*,u.name AS account_name FROM security_events e
            LEFT JOIN users u ON u.id=e.user_id
            WHERE ({' OR '.join(clauses)}) AND {time_clause(db, 'e.created_at')}
            ORDER BY e.created_at DESC,e.id DESC LIMIT 1001''', [*params,start,end]).fetchall()
        timeline = [dict(key=f'incident:{incident_id}', kind='INCIDENT', title='Incident detected',
                         created_at=creation_timestamp(incident['created_at']), details=incident['title'])]
        for row in events[:1000]:
            if row['event_type'].startswith('INCIDENT_RESPONSE_'):
                continue  # The response below includes its reason, actor and outcome.
            timeline.append(dict(key=f"event:{row['id']}", kind='EVENT', title=row['event_type'].replace('_',' '),
                created_at=creation_timestamp(row['created_at']), details=row['details'],
                account_email=row['account_email'], source_ip=row['source_ip'], severity=row['severity']))
        alert_clauses = ['source_ip=?']
        alert_params = [incident['source_ip']]
        if accounts:
            marks = ','.join('?' for _ in accounts)
            alert_clauses.append(f'lower(account_email) IN ({marks})')
            alert_params.extend(row['email'].lower() for row in accounts)
        alerts = db.execute(f'''SELECT * FROM security_alerts WHERE ({' OR '.join(alert_clauses)}) AND
            {time_clause(db, 'created_at')} ORDER BY created_at DESC,id DESC LIMIT 501''',
            [*alert_params, start, end]).fetchall()
        for row in alerts[:500]:
            timeline.append(dict(key=f"alert:{row['id']}", kind='ALERT', title=row['title'],
                created_at=creation_timestamp(row['created_at']), details=row['description'], severity=row['severity'],
                account_email=row['account_email'], alert_id=row['id']))
        notes = db.execute('''SELECT n.*,u.name AS analyst_name FROM incident_notes n
            LEFT JOIN users u ON u.id=n.analyst_id WHERE n.incident_id=?
            ORDER BY n.created_at DESC,n.id DESC LIMIT 501''', (incident_id,)).fetchall()
        for row in notes[:500]:
            timeline.append(dict(key=f"note:{row['id']}", kind='NOTE', title='Analyst note',
                created_at=creation_timestamp(row['created_at']), details=row['note'],
                actor_name=row['analyst_name'] or f"Analyst #{row['analyst_id']}"))
        actions = db.execute('SELECT * FROM incident_response_actions WHERE incident_id=? ORDER BY created_at DESC,id DESC LIMIT 501', (incident_id,)).fetchall()
        for row in actions[:500]:
            timeline.append(dict(key=f"response:{row['id']}", kind='RESPONSE', title=row['action'].replace('_',' '),
                created_at=creation_timestamp(row['created_at']), details=row['details'], reason=row['reason'],
                outcome=row['outcome'], actor_name=row['actor_name'], actor_email=row['actor_email'], account_email=row['target_email']))
        actor = db.execute('SELECT email FROM users WHERE id=?', (session['user_id'],)).fetchone()
        can_manage = actor is not None and actor['email'].lower() == access_api.ACCESS_ADMIN_EMAIL
        candidates = []
        for account in accounts:
            guard = protection(db, account, session['user_id'])
            candidates.append(dict(id=account['id'], name=account['name'], email=account['email'], status=account['account_status'],
                can_suspend=can_manage and guard is None and account['account_status']=='ACTIVE',
                can_revoke=can_manage and guard is None,
                protection_reason=guard))
        timeline.sort(key=lambda item: (item['created_at'] or '', item['key']))
        return jsonify(timeline=timeline, accounts=candidates, can_manage_accounts=can_manage,
            truncated=len(events)>1000 or len(alerts)>500 or len(notes)>500 or len(actions)>500,
            window=dict(start=creation_timestamp(start), end=creation_timestamp(end)))
    finally:
        db.close()


def record_action(db, incident_id, actor, payload, fingerprint, target, outcome, details, status):
    row = db.execute('''INSERT INTO incident_response_actions
        (incident_id,actor_id,actor_name,actor_email,target_user_id,target_email,action,outcome,
         reason,details,request_id,fingerprint,http_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id''',
        (incident_id,actor['id'],actor['name'],actor['email'],target['id'] if target else None,
         target['email'] if target else None,payload['action'],outcome,payload['reason'],details,
         payload['request_id'],fingerprint,status)).fetchone()
    # Write the security audit record in the same transaction as the state change.
    db.execute('''INSERT INTO security_events (user_id,event_type,source_ip,severity,details,account_email)
        VALUES (?,?,?,?,?,?)''', (actor['id'], 'INCIDENT_RESPONSE_'+outcome, request.remote_addr,
        'INFO' if outcome=='SUCCEEDED' else 'WARNING',
        f"Incident {incident_id}: {payload['action']} ({outcome}); response {row['id']}", actor['email']))
    return row['id']


@incident_response_bp.post('/api/security/incidents/<int:incident_id>/response')
@role_required('SOC_ADMIN')
def respond(incident_id):
    return apply_response(incident_id)


def apply_response(incident_id, status_only=False):
    if not valid_origin():
        return jsonify(error='Request origin denied'), 403
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error='A JSON request is required'), 400
    payload = dict(payload)
    if status_only:
        payload['action'] = 'UPDATE_STATUS'
    if payload.get('action') not in ('UPDATE_STATUS','SUSPEND_ACCOUNT','REVOKE_SESSIONS'):
        return jsonify(error='Choose a valid response action.'), 400
    reason = payload.get('reason')
    if not isinstance(reason, str) or not 10 <= len(reason.strip()) <= 1000:
        return jsonify(error='Enter a reason between 10 and 1000 characters.'), 400
    payload['reason'] = reason.strip()
    try:
        payload['request_id'] = str(uuid.UUID(str(payload.get('request_id',''))))
    except ValueError:
        return jsonify(error='A valid response request ID is required.'), 400
    if payload['action']=='UPDATE_STATUS':
        if payload.get('status') not in ('OPEN','INVESTIGATING','RESOLVED'):
            return jsonify(error='Invalid status'), 400
        target_id = None
    else:
        target_id = payload.get('account_id')
        if isinstance(target_id, bool) or not isinstance(target_id, int) or target_id <= 0:
            return jsonify(error='Choose a related account.'), 400
    identity = {key:payload.get(key) for key in ('action','status','account_id','reason')}
    fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    db = get_db_connection()
    try:
        db.execute('BEGIN' if hasattr(db,'connection') else 'BEGIN IMMEDIATE')
        incident = db.execute('SELECT * FROM security_incidents WHERE id=?'+(' FOR UPDATE' if hasattr(db,'connection') else ''), (incident_id,)).fetchone()
        if incident is None:
            return jsonify(error='Incident not found'), 404
        # Serialize account responses with existing account-administration transactions.
        if hasattr(db,'connection'):
            db.execute("SELECT id FROM users WHERE role='SOC_ADMIN' ORDER BY id FOR UPDATE").fetchall()
        actor = db.execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
        if (actor is None or actor['account_status'] != 'ACTIVE'
                or actor['access_version'] != session.get('access_version', 0)
                or actor['role'] != session.get('role')
                or 'SOC_ADMIN' not in account_roles(db, actor['id'], actor['role'])):
            return jsonify(error='Your account access changed. Please sign in again.'), 401
        previous = db.execute('SELECT * FROM incident_response_actions WHERE actor_id=? AND request_id=?', (actor['id'],payload['request_id'])).fetchone()
        if previous:
            if previous['incident_id'] != incident_id or previous['fingerprint'] != fingerprint:
                return jsonify(error='This request ID was already used for a different response.'), 409
            return jsonify(success=previous['outcome']=='SUCCEEDED', outcome=previous['outcome'],
                           error=previous['details'] if previous['http_status']!=200 else None, response_id=previous['id']), previous['http_status']
        target = None
        denial = None
        if payload['action']!='UPDATE_STATUS':
            if actor['email'].lower()!=access_api.ACCESS_ADMIN_EMAIL:
                denial = ('Only the designated administrator can contain accounts.',403)
            elif not isinstance(payload.get('current_password'),str) or len(payload['current_password']) > 1024 or not check_password_hash(actor['password_hash'],payload['current_password']):
                denial = ('Your administrator password is incorrect.',403)
            else:
                related = {row['id'] for row in related_accounts(db, incident)}
                if target_id not in related:
                    denial = ('Choose an account with recorded evidence for this incident.',400)
                else:
                    target = db.execute('SELECT * FROM users WHERE id=?'+(' FOR UPDATE' if hasattr(db,'connection') else ''),(target_id,)).fetchone()
                    guard = protection(db,target,actor['id'])
                    if guard:
                        denial = (guard,403)
                    elif payload['action']=='SUSPEND_ACCOUNT' and target['account_status']!='ACTIVE':
                        denial = ('This account is already suspended.',409)
        if denial:
            message, status = denial
            response_id = record_action(db,incident_id,actor,payload,fingerprint,target,'FAILED',message,status)
            db.commit()
            return jsonify(error=message,outcome='FAILED',response_id=response_id),status
        if payload['action']=='UPDATE_STATUS':
            db.execute('''UPDATE security_incidents SET status=?,resolved_at=
                CASE WHEN ?='RESOLVED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?''',
                (payload['status'],payload['status'],incident_id))
            details = f"Incident status changed from {incident['status']} to {payload['status']}."
        else:
            if payload['action']=='SUSPEND_ACCOUNT':
                db.execute("UPDATE users SET account_status='SUSPENDED',access_version=access_version+1 WHERE id=?",(target_id,))
                details = 'Account suspended and existing sessions revoked.'
            else:
                db.execute('UPDATE users SET access_version=access_version+1 WHERE id=?',(target_id,))
                details = 'Existing sessions revoked. The account can sign in again.'
        response_id = record_action(db,incident_id,actor,payload,fingerprint,target,'SUCCEEDED',details,200)
        db.commit()
        return jsonify(success=True,outcome='SUCCEEDED',response_id=response_id)
    finally:
        db.close()
