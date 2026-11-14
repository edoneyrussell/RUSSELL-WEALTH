"""Bounded, read-only SOC autocomplete over accounts and recorded security data."""
from urllib.parse import urlencode
from flask import jsonify, request, current_app
from authorization import role_required
from access_api import access_bp, directory_sources, source_connection


def contains(columns, term):
    pattern = '%' + term.lower().replace('!', '!!').replace('%', '!%').replace('_', '!_') + '%'
    return '(' + ' OR '.join(f"LOWER(COALESCE({column}, '')) LIKE ? ESCAPE '!'" for column in columns) + ')', [pattern] * len(columns)


def search_source(source, primary, term):
    db = source_connection(source, primary)
    results = []
    def add(kind, key, title, description, path, **params):
        results.append(dict(kind=kind, key=f'{source}:{kind}:{key}', title=str(title),
                            description=str(description), href=path + '?' + urlencode(params), source=source))
    try:
        if source == 'live':
            db.execute('SET TRANSACTION READ ONLY')
            db.execute("SET LOCAL statement_timeout = '3s'")
        where, params = contains(['name', 'email', 'role', 'account_status'], term)
        for row in db.execute(f'SELECT id,name,email,role FROM users WHERE {where} ORDER BY name,id LIMIT 6', params).fetchall():
            add('Account', row['id'], row['name'], row['email'] + ' · Access Management', '/security/access',
                search=row['email'], account=f"{source}:{row['id']}")
        event_columns = ['u.name', 'u.email', 'e.account_email', 'e.source_ip', 'e.event_type', 'e.details', 'e.severity']
        where, params = contains(event_columns, term)
        base = f'FROM security_events e LEFT JOIN users u ON u.id=e.user_id WHERE {where}'
        for row in db.execute(f'''SELECT e.id,e.event_type,e.source_ip,COALESCE(u.name,e.account_email,u.email,'System') AS name
            {base} ORDER BY e.created_at DESC,e.id DESC LIMIT 6''', params).fetchall():
            add('Log', row['id'], row['event_type'].replace('_', ' '),
                f"{row['name']} · {row['source_ip'] or 'No IP recorded'} · Security Logs", '/security',
                panel='logs', search=term, event=f"{source}:{row['id']}")
        for row in db.execute(f'''SELECT e.source_ip,COUNT(*) AS n {base}
            AND e.source_ip IS NOT NULL AND e.source_ip<>'' GROUP BY e.source_ip ORDER BY n DESC,e.source_ip LIMIT 4''', params).fetchall():
            add('IP address', row['source_ip'], row['source_ip'], f"{row['n']} matching events · Security Logs", '/security', panel='logs', search=row['source_ip'])
        # Alert and incident screens use the primary security database.
        if source == primary:
            where, params = contains(['a.title','a.description','a.source_ip','a.account_email','a.alert_type','a.severity','a.status','a.review_state','u.name','u.email'], term)
            for row in db.execute(f'''SELECT a.id,a.title,a.source_ip,a.account_email,a.severity
                FROM security_alerts a LEFT JOIN security_events e ON e.id=a.event_id
                LEFT JOIN users u ON u.id=e.user_id WHERE {where}
                ORDER BY a.created_at DESC,a.id DESC LIMIT 6''', params).fetchall():
                add('Alert', row['id'], row['title'], f"{row['severity']} · {row['account_email'] or row['source_ip'] or 'Security Alerts'}", '/security', panel='alerts', alert=row['id'])
            direct, params = contains(['i.title','i.description','i.source_ip','i.status','i.severity','CAST(i.id AS TEXT)'], term)
            related, related_params = contains(event_columns, term)
            notes, note_params = contains(['n.note'], term)
            for row in db.execute(f'''SELECT i.id,i.title,i.source_ip,i.status FROM security_incidents i
                WHERE {direct} OR EXISTS(SELECT 1 FROM security_events e LEFT JOIN users u ON u.id=e.user_id
                    WHERE e.source_ip=i.source_ip AND {related})
                OR EXISTS(SELECT 1 FROM incident_notes n WHERE n.incident_id=i.id AND {notes})
                ORDER BY i.created_at DESC,i.id DESC LIMIT 6''', params + related_params + note_params).fetchall():
                add('Incident', row['id'], row['title'], f"#{row['id']} · {row['status']} · {row['source_ip'] or 'No IP recorded'}", '/security/incidents', incident=row['id'])
        return results
    finally:
        db.close()


@access_bp.get('/api/security/search')
@role_required('SOC_ADMIN')
def security_search():
    term = request.args.get('q', '').strip()[:128]
    primary, sources = directory_sources()
    results, unavailable = [], []
    if term:
        for source in sources:
            try:
                results.extend(search_source(source, primary, term))
            except Exception:
                current_app.logger.exception('SOC search source unavailable: %s', source)
                unavailable.append(source)
    response = jsonify(results=results[:40], unavailable_sources=unavailable)
    if term and len(unavailable) == len(sources):
        response.status_code = 503
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response
