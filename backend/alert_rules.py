"""Deterministic SOC detections over recorded authentication events."""
import hashlib
import json
import os
from datetime import datetime, timezone


def initialize_alert_schema(db):
    postgres = os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres'
    columns = {'account_email': 'TEXT', 'review_state': "TEXT NOT NULL DEFAULT 'NEW'",
               'evidence_json': "TEXT NOT NULL DEFAULT '[]'", 'dedupe_key': 'TEXT'}
    existing = set() if postgres else {r['name'] for r in db.execute('PRAGMA table_info(security_alerts)')}
    for name, kind in columns.items():
        if postgres or name not in existing:
            db.execute(f'ALTER TABLE security_alerts ADD COLUMN {"IF NOT EXISTS " if postgres else ""}{name} {kind}')
    db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_dedupe ON security_alerts(dedupe_key)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_event_ip_time ON security_events(source_ip, created_at)')
    db.execute('CREATE INDEX IF NOT EXISTS idx_event_email_time ON security_events(account_email, created_at)')


def evaluate_event(db, event):
    """Runs in the event's transaction, never calls external services or records credentials."""
    kind = event['event_type']
    if kind not in ('LOGIN_FAILED', 'PASSWORD_RESET_REQUEST', 'SOC_ACCESS_DENIED',
                    'SUSPENDED_LOGIN_ATTEMPT', 'PROFILE_EMAIL_CHANGED', 'PASSWORD_CHANGED', 'PASSWORD_RESET'):
        return
    recent = ("created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'"
              if os.environ.get('RW_DB_ENGINE', 'sqlite').lower() == 'postgres'
              else "datetime(created_at) >= datetime('now', '-10 minutes')")
    rows = [dict(r) for r in db.execute(f'''SELECT id,user_id,account_email,event_type,source_ip,created_at
        FROM security_events WHERE {recent} AND (source_ip=? OR account_email=? OR user_id=?)
        ORDER BY id DESC LIMIT 1000''', (event['source_ip'], event['account_email'], event['user_id'])).fetchall()]
    failures = [r for r in rows if r['event_type'] == 'LOGIN_FAILED']
    ip_failures = [r for r in failures if event['source_ip'] and r['source_ip'] == event['source_ip']]
    account_failures = [r for r in failures if
        (event['user_id'] is not None and r['user_id'] == event['user_id']) or
        (event['account_email'] and r['account_email'] == event['account_email'])]

    def emit(rule, title, description, severity, evidence, scope):
        # One alert per rule/scope in a ten-minute bucket, even across concurrent workers.
        bucket = int(datetime.now(timezone.utc).timestamp()) // 600
        key = hashlib.sha256(f'{rule}:{scope}:{bucket}'.encode()).hexdigest()
        db.execute('''INSERT INTO security_alerts
            (event_id,alert_type,title,description,severity,source_ip,account_email,evidence_json,dedupe_key)
            VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING''',
            (event['id'],rule,title,description,severity,event['source_ip'],event['account_email'],
             json.dumps(evidence[:50], default=str),key))

    if kind == 'LOGIN_FAILED':
        if len(account_failures) >= 5:
            emit('REPEATED_ACCOUNT_FAILURES', 'Repeated failed sign-ins',
                 'At least 5 failed sign-ins for this account in 10 minutes.', 'WARNING', account_failures, event['account_email'])
        if len({r['account_email'] for r in ip_failures if r['account_email']}) >= 5:
            emit('PASSWORD_SPRAY', 'One IP trying multiple accounts',
                 'Failed sign-ins for at least 5 different emails from one IP in 10 minutes.', 'CRITICAL', ip_failures, event['source_ip'])
        if len(ip_failures) >= 10:
            emit('REPEATED_IP_FAILURES', 'High volume of failed sign-ins',
                 'At least 10 failed sign-ins from one IP in 10 minutes.', 'CRITICAL', ip_failures, event['source_ip'])
    elif kind == 'PASSWORD_RESET_REQUEST':
        attempts = [r for r in rows if r['event_type'] == kind and
                    (r['source_ip'] == event['source_ip'] or r['account_email'] == event['account_email'])]
        for scope, selected in ((f"ip:{event['source_ip']}", [r for r in attempts if r['source_ip'] == event['source_ip']]),
                                (f"email:{event['account_email']}", [r for r in attempts if r['account_email'] == event['account_email']])):
            if len(selected) >= 5:
                emit('RESET_ABUSE', 'Repeated password reset requests',
                     'At least 5 reset requests for one account or from one IP in 10 minutes, including rate-limited requests.',
                     'WARNING', selected, scope)
    elif kind in ('SOC_ACCESS_DENIED', 'SUSPENDED_LOGIN_ATTEMPT'):
        emit(kind, 'Unauthorized SOC access' if kind == 'SOC_ACCESS_DENIED' else 'Suspended account sign-in attempt',
             'An authenticated account attempted to access a protected SOC endpoint.' if kind == 'SOC_ACCESS_DENIED'
             else 'A sign-in was rejected because this account is suspended.', 'WARNING', [dict(event)],
             f"{event['user_id']}:{event['source_ip']}")
    elif len(account_failures) >= 3:
        emit('ACCOUNT_CHANGE_AFTER_FAILURES', 'Account change after failed sign-ins',
             'Login email or password changed after at least 3 failed sign-ins in 10 minutes. Review to confirm the owner made this change.',
             'CRITICAL', [dict(event), *account_failures], event['user_id'])
