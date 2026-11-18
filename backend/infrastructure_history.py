"""Persist observed infrastructure checks without inventing coverage in unmonitored periods."""
import os
from datetime import datetime,timezone
from database import get_db_connection

SERVICES=('Vercel','Render','Neon')


def initialize_infrastructure_history():
    db=get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS infrastructure_checks (
            service TEXT NOT NULL, bucket BIGINT NOT NULL, checked_at TEXT NOT NULL,
            status TEXT NOT NULL, latency_ms INTEGER,
            PRIMARY KEY(service,bucket))''')
        db.commit()
    finally:
        db.close()


def observed_history(services, now=None):
    now=now or datetime.now(timezone.utc)
    epoch=int(now.timestamp())
    slot=epoch//15
    db=get_db_connection()
    try:
        for service in services:
            db.execute('''INSERT INTO infrastructure_checks(service,bucket,checked_at,status,latency_ms)
                VALUES (?,?,?,?,?) ON CONFLICT(service,bucket) DO UPDATE SET
                checked_at=excluded.checked_at,status=CASE
                    WHEN infrastructure_checks.status='offline' OR excluded.status='offline' THEN 'offline'
                    WHEN infrastructure_checks.status='degraded' OR excluded.status='degraded' THEN 'degraded'
                    WHEN infrastructure_checks.status='unconfigured' OR excluded.status='unconfigured' THEN 'unconfigured'
                    ELSE excluded.status END,latency_ms=excluded.latency_ms''',
                (service['name'],slot,now.isoformat(),service['status'],service['latency_ms']))
        db.execute('DELETE FROM infrastructure_checks WHERE bucket<?',((epoch-7*86400)//15,))
        # Aggregate before transfer; raw observations and retention remain unchanged.
        rows=db.execute("""SELECT service, bucket / 120 AS block, COUNT(*) AS checks,
            MIN(checked_at) AS first_check_at,
            SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) AS online_checks,
            SUM(CASE WHEN status IN ('online','offline','degraded') THEN 1 ELSE 0 END) AS measured_checks,
            MAX(CASE status WHEN 'offline' THEN 4 WHEN 'degraded' THEN 3
                WHEN 'unconfigured' THEN 2 WHEN 'online' THEN 1 ELSE 0 END) AS priority
            FROM infrastructure_checks WHERE bucket>=?
            GROUP BY service, bucket / 120 ORDER BY block""",((epoch-86400)//15,)).fetchall()
        db.commit()
    finally:
        db.close()
    result={}
    # Forty-eight half-hour windows; each block reflects its worst observed result.
    current=epoch//1800
    priority={'unknown':0,'online':1,'unconfigured':2,'degraded':3,'offline':4}
    for name in SERVICES:
        points=[row for row in rows if row['service']==name]
        buckets={index:dict(start=datetime.fromtimestamp(index*1800,timezone.utc).isoformat(),status='unknown',checks=0)
                 for index in range(current-47,current+1)}
        for point in points:
            block=buckets.get(point['block'])
            if block is not None:
                block['checks']+=point['checks']
                if point['priority']>priority[block['status']]:
                    block['status']=next(status for status,rank in priority.items() if rank==point['priority'])
        measured=sum(point['measured_checks'] for point in points)
        result[name]=dict(blocks=list(buckets.values()),sample_count=sum(point['checks'] for point in points),
            availability_pct=round(100*sum(point['online_checks'] for point in points)/measured,2) if measured else None,
            first_check_at=min(point['first_check_at'] for point in points) if points else None)
    return result


def runtime_deployment():
    """Only publish deliberately selected, non-secret deployment metadata."""
    return dict(provider='Render' if os.getenv('RENDER')=='true' else 'Application',
        commit=os.getenv('RENDER_GIT_COMMIT') or os.getenv('RW_DEPLOY_COMMIT') or None,
        branch=os.getenv('RENDER_GIT_BRANCH') or None,
        environment='production' if os.getenv('RENDER')=='true' else 'local',
        built_at=None)


def current_application():
    """SOC-only checkout context; never use local Git as production evidence."""
    deployment = runtime_deployment()
    if deployment['environment'] != 'local':
        return deployment
    import subprocess
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    def git(*args):
        try:
            return subprocess.check_output(['git', *args], cwd=root, timeout=2,
                stderr=subprocess.DEVNULL, text=True).strip()
        except (OSError, subprocess.SubprocessError):
            return None
    deployment.update(commit=git('rev-parse', 'HEAD'), branch=git('rev-parse', '--abbrev-ref', 'HEAD'))
    changes = git('status', '--porcelain', '--untracked-files=normal')
    deployment['uncommitted_changes'] = bool(changes) if changes is not None else None
    return deployment
