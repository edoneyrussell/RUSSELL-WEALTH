"""Server-side session inventory and individual revocation for signed Flask sessions."""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime,timedelta,timezone
from flask import Blueprint,jsonify,request,session,current_app
from werkzeug.security import check_password_hash
from authorization import login_required,role_required
from database import get_db_connection
from access_api import valid_origin,creation_timestamp,is_owner
from roles import account_roles
import access_api

sessions_bp=Blueprint('active_sessions',__name__)

def now_utc():
    return datetime.now(timezone.utc)

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def initialize_active_sessions():
    db=get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS active_login_sessions (
            id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,user_id BIGINT NOT NULL,
            access_version INTEGER NOT NULL,source_ip TEXT,user_agent TEXT,
            login_event_id BIGINT,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,revoked_at TEXT,revoked_by BIGINT,revocation_reason TEXT)''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON active_login_sessions(user_id,expires_at)')
        db.commit()
    finally: db.close()


def start_session(user_id,login_event_id=None,db=None,migration_token=None):
    own=db is None
    db=db or get_db_connection()
    try:
        end_current_session(db)
        user=db.execute('SELECT access_version FROM users WHERE id=?',(user_id,)).fetchone()
        if not user:
            raise ValueError('Session account does not exist')
        token=migration_token or secrets.token_urlsafe(32)
        now=now_utc()
        db.execute('''INSERT INTO active_login_sessions
            (id,token_hash,user_id,access_version,source_ip,user_agent,login_event_id,created_at,last_seen_at,expires_at)
            VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token_hash) DO NOTHING''',(str(uuid.uuid4()),digest(token),user_id,user['access_version'],
            request.remote_addr,(request.user_agent.string or '')[:1000],login_event_id,
            now.isoformat(),now.isoformat(),(now+timedelta(days=30)).isoformat()))
        db.commit()
        session['login_session_token']=token
    finally:
        if own: db.close()


def end_current_session(db=None):
    token=session.get('login_session_token')
    if not isinstance(token,str): return
    own=db is None
    db=db or get_db_connection()
    try:
        db.execute('UPDATE active_login_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL',
                   (now_utc().isoformat(),digest(token)))
        if own: db.commit()
    finally:
        if own: db.close()


def validate_session(db,user_id):
    token=session.get('login_session_token')
    if token is None:
        # Existing signed sessions become individually tracked on their next request.
        cookie=request.cookies.get(current_app.config['SESSION_COOKIE_NAME'])
        if not cookie:return False
        key=current_app.secret_key
        key=key.encode() if isinstance(key,str) else key
        token=hmac.new(key,('session-migration:'+cookie).encode(),hashlib.sha256).hexdigest()
        # Parallel requests carrying the same legacy cookie must create one session,
        # and replaying that cookie must not resurrect a revoked session.
        start_session(user_id,db=db,migration_token=token)
    if not isinstance(token,str) or len(token)>200: return False
    row=db.execute('SELECT id,revoked_at,expires_at,last_seen_at,access_version FROM active_login_sessions WHERE token_hash=? AND user_id=?',(digest(token),user_id)).fetchone()
    if not row or row['revoked_at'] or row['expires_at']<=now_utc().isoformat(): return False
    # Account/access-version validation already ran. Legitimate self-service account
    # changes can rotate the cookie version while retaining this particular session.
    last=datetime.fromisoformat(row['last_seen_at'])
    if (now_utc()-last).total_seconds()>=60 or row['access_version']!=session.get('access_version',0):
        db.execute('UPDATE active_login_sessions SET last_seen_at=?,access_version=? WHERE id=? AND revoked_at IS NULL',
                   (now_utc().isoformat(),session.get('access_version',0),row['id']))
        db.commit()
    return True


def device_label(agent):
    agent=agent or ''
    browser=next((label for needle,label in [('Edg/','Edge'),('OPR/','Opera'),('Firefox/','Firefox'),('Chrome/','Chrome'),('Safari/','Safari')] if needle in agent),'Unknown browser')
    platform=next((label for needle,label in [('iPhone','iPhone'),('iPad','iPad'),('Android','Android'),('Windows','Windows'),('Macintosh','macOS'),('Linux','Linux')] if needle in agent),'Unknown device')
    return f'{browser} · {platform}'


@sessions_bp.after_request
def private(response):
    response.headers['Cache-Control']='private, no-store'
    response.vary.add('Cookie')
    return response


@sessions_bp.get('/api/me/session-heartbeat')
@login_required
def heartbeat():
    return jsonify(success=True)


@sessions_bp.get('/api/security/sessions')
@role_required('SOC_ADMIN')
def inventory():
    from security_locations import location_fields
    from login_locations import attach_login_locations
    db=get_db_connection()
    try:
        rows=db.execute('''SELECT s.id,s.token_hash,s.user_id,s.login_event_id,s.user_agent,s.source_ip,s.created_at,s.last_seen_at,s.expires_at,u.name,u.email,u.role FROM active_login_sessions s JOIN users u ON u.id=s.user_id
            WHERE s.revoked_at IS NULL AND s.expires_at>? AND u.account_status='ACTIVE'
            AND s.access_version=u.access_version ORDER BY s.last_seen_at DESC LIMIT 201''',(now_utc().isoformat(),)).fetchall()
        actor=db.execute('SELECT email FROM users WHERE id=?',(session['user_id'],)).fetchone()
        manager=actor['email'].lower()==access_api.ACCESS_ADMIN_EMAIL
        current=digest(session['login_session_token'])
        results=[]
        evidence=[dict(id=row['login_event_id'],user_id=row['user_id']) for row in rows[:200] if row['login_event_id']]
        attach_login_locations(db,evidence)
        locations={event['id']:event for event in evidence if event.get('location_basis')=='BROWSER_REPORTED'}
        for row in rows[:200]:
            is_current=row['token_hash']==current
            own=row['user_id']==session['user_id']
            protected=is_owner(row['email']) and not own
            reason='This is your current session. Use Log Out to end it.' if is_current else 'The owner account is protected.' if protected else 'Only the designated administrator can revoke other accounts’ sessions.' if not own and not manager else None
            location=locations.get(row['login_event_id']) or location_fields(row['source_ip'])
            results.append(dict(id=row['id'],user_id=row['user_id'],name=row['name'],email=row['email'],role=row['role'],
                device=device_label(row['user_agent']),source_ip=row['source_ip'],
                created_at=row['created_at'],last_seen_at=row['last_seen_at'],expires_at=row['expires_at'],
                is_current=is_current,can_revoke=reason is None,protection_reason=reason,
                location=location.get('location','Location unavailable'),location_basis=location.get('location_basis'),accuracy_m=location.get('accuracy_m')))
        return jsonify(sessions=results,truncated=len(rows)>200,checked_at=now_utc().isoformat())
    finally: db.close()


@sessions_bp.post('/api/security/sessions/<session_id>/revoke')
@role_required('SOC_ADMIN')
def revoke(session_id):
    if not valid_origin(): return jsonify(error='Request origin denied'),403
    payload=request.get_json(silent=True)
    if not isinstance(payload,dict): return jsonify(error='A JSON object is required'),400
    reason=payload.get('reason')
    password=payload.get('current_password')
    if not isinstance(reason,str) or not 10<=len(reason.strip())<=1000:
        return jsonify(error='Enter a reason between 10 and 1000 characters.'),400
    db=get_db_connection()
    try:
        postgres=hasattr(db,'connection')
        db.execute('BEGIN' if postgres else 'BEGIN IMMEDIATE')
        # Match the lock order of account administration before locking a session.
        if postgres: db.execute("SELECT id FROM users WHERE role='SOC_ADMIN' ORDER BY id FOR UPDATE").fetchall()
        actor=db.execute('SELECT id,name,email,role,password_hash,account_status,access_version FROM users WHERE id=?',(session['user_id'],)).fetchone()
        if (not actor or actor['account_status']!='ACTIVE' or actor['access_version']!=session.get('access_version',0)
                or 'SOC_ADMIN' not in account_roles(db,actor['id'],actor['role'])):
            return jsonify(error='Your account access changed. Please sign in again.'),401
        live_actor=db.execute("SELECT id FROM active_login_sessions WHERE token_hash=? AND user_id=? AND revoked_at IS NULL AND expires_at>?",(digest(session['login_session_token']),actor['id'],now_utc().isoformat())).fetchone()
        if not live_actor:return jsonify(error='Your session ended. Please sign in again.'),401
        if not isinstance(password,str) or len(password)>1024 or not check_password_hash(actor['password_hash'],password):
            return jsonify(error='Your administrator password is incorrect.'),403
        row=db.execute('''SELECT s.*,u.email FROM active_login_sessions s JOIN users u ON u.id=s.user_id
            WHERE s.id=?'''+(' FOR UPDATE OF s' if postgres else ''),(session_id,)).fetchone()
        if not row: return jsonify(error='Session not found'),404
        if row['token_hash']==digest(session['login_session_token']):
            return jsonify(error='Use Log Out to end your current session.'),403
        if row['user_id']!=actor['id']:
            if actor['email'].lower()!=access_api.ACCESS_ADMIN_EMAIL:
                return jsonify(error='Only the designated administrator can revoke other accounts’ sessions.'),403
            if is_owner(row['email']): return jsonify(error='The owner account is protected.'),403
        if not row['revoked_at']:
            db.execute('UPDATE active_login_sessions SET revoked_at=?,revoked_by=?,revocation_reason=? WHERE id=?',
                       (now_utc().isoformat(),actor['id'],reason.strip(),session_id))
            # Atomic audit: do not end a session if the corresponding audit cannot be saved.
            db.execute('''INSERT INTO security_events(user_id,event_type,source_ip,severity,details,account_email)
                VALUES (?,'SESSION_REVOKED',?,'WARNING',?,?)''',(actor['id'],request.remote_addr,
                f"Session {session_id} for {row['email']} revoked by {actor['email']}. Reason: {reason.strip()}",actor['email']))
        db.commit()
        return jsonify(success=True)
    finally: db.close()
