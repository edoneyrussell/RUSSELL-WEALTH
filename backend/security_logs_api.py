"""Combined SOC logs from the configured account databases."""
from datetime import datetime, timezone
import re
from security_locations import location_fields
from login_locations import attach_login_locations

from flask import jsonify, request, current_app
from authorization import role_required
from access_api import access_bp, directory_sources, source_connection, creation_timestamp


EMAIL_IN_DETAILS = re.compile(r'[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+')


def read_log_source(source, primary, event_type, severity, search, limit):
    db = source_connection(source, primary)
    try:
        if source == 'live':
            db.execute('SET TRANSACTION READ ONLY')
            db.execute("SET LOCAL statement_timeout = '5s'")
            columns = {row['name'] for row in db.execute("SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='security_events'").fetchall()}
        else:
            columns = {row['name'] for row in db.execute('PRAGMA table_info(security_events)').fetchall()}
        snapshot = 'e.account_email' if 'account_email' in columns else 'NULL'
        conditions, params = [], []
        if event_type:
            conditions.append('e.event_type=?')
            params.append(event_type)
        if severity:
            conditions.append('e.severity=?')
            params.append(severity)
        if search:
            # Search joined emails, immutable snapshots and legacy event details.
            escaped = search.lower().replace('!', '!!').replace('%', '!%').replace('_', '!_')
            columns = [snapshot, 'u.name', 'u.email', 'e.details', 'e.source_ip', 'e.event_type', 'e.severity']
            conditions.append('(' + ' OR '.join(f"LOWER(COALESCE({column}, '')) LIKE ? ESCAPE '!'" for column in columns) + ')')
            params.extend([f'%{escaped}%'] * len(columns))
        where = 'WHERE ' + ' AND '.join(conditions) if conditions else ''
        base = f'FROM security_events e LEFT JOIN users u ON u.id=e.user_id {where}'
        total = db.execute(f'SELECT COUNT(*) AS n {base}', params).fetchone()['n']
        rows = db.execute(f'''SELECT e.id, e.user_id, COALESCE({snapshot}, u.email) AS email,
            e.event_type, e.source_ip, e.severity, e.details, e.created_at
            {base} ORDER BY e.created_at DESC, e.id DESC LIMIT ?''', params + [limit]).fetchall()
        events = []
        for row in rows:
            event = dict(row)
            if not event['email'] and event['event_type'] in ('LOGIN_SUCCESS', 'LOGIN_FAILED'):
                match = EMAIL_IN_DETAILS.search(event['details'] or '')
                if match:
                    event['email'] = match.group(0)
            event.update(source=source, source_label='Live website' if source == 'live' else 'Local development',
                         event_key=f"{source}:{event['id']}", created_at=creation_timestamp(event['created_at']))
            events.append(event)
        has_locations = source == primary
        if not has_locations and source == 'live':
            has_locations = bool(db.execute("SELECT to_regclass('security_event_locations') AS relation").fetchone()['relation'])
        elif not has_locations:
            has_locations = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='security_event_locations'").fetchone() is not None
        if has_locations:
            attach_login_locations(db, events)
        return events, total
    finally:
        db.close()


@access_bp.get('/api/security/logs')
@role_required('SOC_ADMIN')
def combined_security_logs():
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(100, max(1, int(request.args.get('per_page', 25))))
    except (ValueError, TypeError):
        return jsonify(success=False, error='Invalid pagination'), 400
    event_type = request.args.get('event_type', '').strip()
    severity = request.args.get('severity', '').strip().upper()
    search = request.args.get('search', '').strip()[:254]
    primary, configured = directory_sources()
    logs, sources, total = [], [], 0
    for source in configured:
        label = 'Live website' if source == 'live' else 'Local development'
        try:
            events, count = read_log_source(source, primary, event_type, severity, search, page * per_page)
            logs.extend(events)
            total += count
            sources.append(dict(key=source, label=label, status='connected', count=count))
        except Exception:
            current_app.logger.exception('Security log source unavailable: %s', source)
            sources.append(dict(key=source, label=label, status='unavailable', count=None))
    if all(source['status'] == 'unavailable' for source in sources):
        response = jsonify(success=False, error='Security log databases are unavailable', sources=sources)
        response.status_code = 503
    else:
        earliest = datetime.min.replace(tzinfo=timezone.utc)
        logs.sort(key=lambda event: (datetime.fromisoformat(event['created_at'].replace('Z', '+00:00')) if event['created_at'] else earliest, event['source'], event['id']), reverse=True)
        offset = (page - 1) * per_page
        response = jsonify(success=True, logs=[{**event, **({} if event.get('location_basis') == 'BROWSER_REPORTED' else location_fields(event['source_ip']))} for event in logs[offset:offset + per_page]], sources=sources,
                           pagination=dict(page=page, per_page=per_page, total=total, total_pages=(total + per_page - 1) // per_page))
    response.headers['Cache-Control'] = 'no-store'
    return response
