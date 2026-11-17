"""Analyst ownership and persisted, in-app escalation for overdue critical alerts."""
import os
from datetime import datetime,timedelta,timezone
from flask import Blueprint,jsonify,request,session
from authorization import role_required
from access_api import valid_origin,creation_timestamp
from database import get_db_connection

workflows_bp=Blueprint('alert_workflows',__name__)

def sla_minutes():
    try:return max(1,min(1440,int(os.getenv('RW_CRITICAL_ALERT_SLA_MINUTES','15'))))
    except ValueError:return 15

def initialize_alert_workflows():
    db=get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS alert_workflows (
            alert_id BIGINT PRIMARY KEY, assigned_user_id BIGINT, assigned_at TEXT,
            assigned_by BIGINT, escalated_at TEXT, escalation_ack_at TEXT,
            escalation_ack_by BIGINT, version INTEGER NOT NULL DEFAULT 0)''')
        db.execute('CREATE INDEX IF NOT EXISTS idx_alert_escalation_candidates ON security_alerts(status,severity,created_at)')
        db.commit()
    finally:db.close()


def audit(db,kind,details,actor_id=None,email=None):
    db.execute('''INSERT INTO security_events(user_id,event_type,source_ip,severity,details,account_email)
        VALUES (?,?,?,?,?,?)''',(actor_id,kind,request.remote_addr if actor_id else None,
        'CRITICAL' if kind=='ALERT_ESCALATED' else 'INFO',details,email))


def escalate_overdue(db):
    if not hasattr(db,'connection'):db.execute('BEGIN IMMEDIATE')
    cutoff=(datetime.now(timezone.utc)-timedelta(minutes=sla_minutes())).isoformat()
    condition='CAST(created_at AS timestamp)<=CAST(? AS timestamp)' if hasattr(db,'connection') else 'datetime(created_at)<=datetime(?)'
    rows=db.execute(f"SELECT id,title,account_email FROM security_alerts WHERE status='ACTIVE' AND severity='CRITICAL' AND {condition}"+(' FOR UPDATE' if hasattr(db,'connection') else ''),(cutoff,)).fetchall()
    now=datetime.now(timezone.utc).isoformat()
    for row in rows:
        db.execute('INSERT INTO alert_workflows(alert_id) VALUES (?) ON CONFLICT(alert_id) DO NOTHING',(row['id'],))
        changed=db.execute('''UPDATE alert_workflows SET escalated_at=?,version=version+1
            WHERE alert_id=? AND escalated_at IS NULL RETURNING alert_id''',(now,row['id'])).fetchone()
        if changed:
            audit(db,'ALERT_ESCALATED',f"Critical alert {row['id']} exceeded the {sla_minutes()} minute unresolved-alert deadline. Escalated to the SOC critical queue.",email=row['account_email'])
    db.commit()


def enrich(alert):
    created=creation_timestamp(alert.get('created_at'))
    due=datetime.fromisoformat(created.replace('Z','+00:00'))+timedelta(minutes=sla_minutes()) if created and alert['severity']=='CRITICAL' else None
    alert['due_at']=due.isoformat() if due else None
    alert['is_overdue']=bool(due and due<=datetime.now(timezone.utc) and alert['status']!='RESOLVED')
    alert['workflow_version']=alert.pop('assignment_version',None) or 0
    return alert


@workflows_bp.patch('/api/security/alerts/<int:alert_id>/assignment')
@role_required('SOC_ADMIN')
def assign(alert_id):
    if not valid_origin():return jsonify(error='Request origin denied'),403
    payload=request.get_json(silent=True)
    if not isinstance(payload,dict):return jsonify(error='A JSON object is required'),400
    target=payload.get('assigned_user_id')
    version=payload.get('expected_version')
    if (target is not None and (isinstance(target,bool) or not isinstance(target,int) or target<=0)) or isinstance(version,bool) or not isinstance(version,int) or version<0:
        return jsonify(error='Choose a valid analyst and assignment version.'),400
    db=get_db_connection()
    try:
        db.execute('BEGIN' if hasattr(db,'connection') else 'BEGIN IMMEDIATE')
        if hasattr(db,'connection'):
            db.execute("SELECT id FROM users WHERE role='SOC_ADMIN' ORDER BY id FOR UPDATE").fetchall()
        actor=db.execute('SELECT account_status,access_version,role FROM users WHERE id=?',(session['user_id'],)).fetchone()
        if not actor or actor['account_status']!='ACTIVE' or actor['role']!='SOC_ADMIN' or actor['access_version']!=session.get('access_version',0):
            return jsonify(error='Your account access changed. Please sign in again.'),401
        alert=db.execute('SELECT * FROM security_alerts WHERE id=?'+(' FOR UPDATE' if hasattr(db,'connection') else ''),(alert_id,)).fetchone()
        if not alert:return jsonify(error='Alert not found'),404
        if alert['status']!='ACTIVE':return jsonify(error='Reopen the alert before changing its assignment.'),409
        analyst=db.execute("SELECT name,email FROM users WHERE id=? AND role='SOC_ADMIN' AND account_status='ACTIVE'",(target,)).fetchone() if target else None
        if target and not analyst:return jsonify(error='Choose an active SOC analyst.'),400
        db.execute('INSERT INTO alert_workflows(alert_id) VALUES (?) ON CONFLICT(alert_id) DO NOTHING',(alert_id,))
        current=db.execute('SELECT * FROM alert_workflows WHERE alert_id=?',(alert_id,)).fetchone()
        if current['version']!=version:return jsonify(error='This alert changed. Refresh before assigning it again.'),409
        db.execute('''UPDATE alert_workflows SET assigned_user_id=?,assigned_at=?,assigned_by=?,version=version+1 WHERE alert_id=?''',
                   (target,datetime.now(timezone.utc).isoformat() if target else None,session['user_id'],alert_id))
        actor=db.execute('SELECT email FROM users WHERE id=?',(session['user_id'],)).fetchone()
        audit(db,'ALERT_ASSIGNED',f"Alert {alert_id} assignment changed from analyst {current['assigned_user_id']} to {analyst['email'] if analyst else 'Unassigned'} by {actor['email']}.",session['user_id'],alert['account_email'])
        db.commit()
        return jsonify(success=True)
    finally:db.close()


@workflows_bp.post('/api/security/alerts/<int:alert_id>/acknowledge-escalation')
@role_required('SOC_ADMIN')
def acknowledge(alert_id):
    if not valid_origin():return jsonify(error='Request origin denied'),403
    db=get_db_connection()
    try:
        db.execute('BEGIN' if hasattr(db,'connection') else 'BEGIN IMMEDIATE')
        alert=db.execute('SELECT * FROM security_alerts WHERE id=?'+(' FOR UPDATE' if hasattr(db,'connection') else ''),(alert_id,)).fetchone()
        if not alert:return jsonify(error='Alert not found'),404
        if alert['status']!='ACTIVE':return jsonify(error='This alert is already resolved.'),409
        changed=db.execute('''UPDATE alert_workflows SET escalation_ack_at=?,escalation_ack_by=?,version=version+1
            WHERE alert_id=? AND escalated_at IS NOT NULL AND escalation_ack_at IS NULL RETURNING alert_id''',
            (datetime.now(timezone.utc).isoformat(),session['user_id'],alert_id)).fetchone()
        if changed:
            audit(db,'ALERT_ESCALATION_ACKNOWLEDGED',f'Escalation for alert {alert_id} acknowledged by analyst {session["user_id"]}.',session['user_id'],alert['account_email'])
        db.commit()
        return jsonify(success=True)
    finally:db.close()
