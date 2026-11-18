"""Consent-based, device-reported locations bound to a single authenticated sign-in."""
import math
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request, session
from authorization import login_required
from access_api import valid_origin, creation_timestamp
from database import get_db_connection

login_locations_bp = Blueprint('login_locations', __name__)


def initialize_login_locations():
    db = get_db_connection()
    try:
        # Retain the location snapshot with the historical event identifier.
        db.execute('''CREATE TABLE IF NOT EXISTS security_event_locations (
            event_id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL,
            status TEXT NOT NULL, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
            accuracy_m DOUBLE PRECISION, captured_at TEXT,
            recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)''')
        db.commit()
    finally:
        db.close()


def pending_event(db):
    event_id = session.get('login_location_event_id')
    if not event_id:
        return None
    event = db.execute("SELECT id,event_type,created_at FROM security_events WHERE id=? AND user_id=? AND event_type IN ('LOGIN_SUCCESS','SESSION_LOCATION_REQUESTED')",
                       (event_id,session['user_id'])).fetchone()
    if not event:
        return None
    created = creation_timestamp(event['created_at'])
    if not created or datetime.fromisoformat(created.replace('Z','+00:00')) < datetime.now(timezone.utc)-timedelta(minutes=10):
        return None
    saved = db.execute('SELECT status FROM security_event_locations WHERE event_id=? AND user_id=?',
                       (event_id,session['user_id'])).fetchone()
    return event if saved is None else None


@login_locations_bp.after_request
def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    response.vary.add('Cookie')
    return response


@login_locations_bp.post('/api/me/sign-in-location/request')
@login_required
def request_location():
    if not valid_origin():
        return jsonify(error='Request origin denied'),403
    db = get_db_connection()
    try:
        event = pending_event(db)
    finally:
        db.close()
    if event is None:
        from security import log_security_event
        event_id = log_security_event(session['user_id'], 'SESSION_LOCATION_REQUESTED', request.remote_addr,
            'INFO', 'User requested location sharing for the current session.')
        session['login_location_event_id'] = event_id
    return jsonify(pending=True)


@login_locations_bp.route('/api/me/sign-in-location', methods=['GET','POST'])
@login_required
def sign_in_location():
    if request.method=='POST' and not valid_origin():
        return jsonify(error='Request origin denied'),403
    db = get_db_connection()
    try:
        event = pending_event(db)
        if request.method=='GET':
            return jsonify(pending=event is not None)
        if event is None:
            return jsonify(error='No recent sign-in is awaiting location.'),409
        payload = request.get_json(silent=True)
        if not isinstance(payload,dict):
            return jsonify(error='A JSON object is required'),400
        status = payload.get('status')
        if status not in ('GRANTED','DENIED','UNAVAILABLE','SKIPPED'):
            return jsonify(error='Invalid location permission status'),400
        lat = lon = accuracy = captured = None
        if status=='GRANTED':
            lat,lon,accuracy = (payload.get(key) for key in ('latitude','longitude','accuracy_m'))
            valid_number = lambda value: isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)
            if (not all(valid_number(value) for value in (lat,lon,accuracy))
                    or not -90<=lat<=90 or not -180<=lon<=180 or not 0<=accuracy<=20000000):
                return jsonify(error='Invalid device location coordinates or accuracy'),400
            captured = payload.get('captured_at')
            normalized = creation_timestamp(captured) if isinstance(captured,str) else None
            if not normalized or abs((datetime.now(timezone.utc)-datetime.fromisoformat(normalized.replace('Z','+00:00'))).total_seconds())>120:
                return jsonify(error='Request a fresh device location.'),400
            captured = normalized
        saved = db.execute('''INSERT INTO security_event_locations
            (event_id,user_id,status,latitude,longitude,accuracy_m,captured_at)
            VALUES (?,?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id''',
            (event['id'],session['user_id'],status,lat,lon,accuracy,captured)).fetchone()
        if saved and status=='GRANTED' and event['event_type']=='SESSION_LOCATION_REQUESTED':
            db.execute("UPDATE security_events SET event_type='SESSION_LOCATION_SHARED',details='User shared device location for the current session.' WHERE id=?",(event['id'],))
        db.commit()
        return jsonify(success=True,recorded=saved is not None)
    finally:
        db.close()


def attach_login_locations(db, events):
    """Use each sign-in's own device report; never transfer it to other events."""
    if not events:
        return events
    ids = [event['id'] for event in events]
    marks = ','.join('?' for _ in ids)
    saved = {row['event_id']:row for row in db.execute(f'SELECT event_id,user_id,status,latitude,longitude,accuracy_m,captured_at FROM security_event_locations WHERE event_id IN ({marks})',ids).fetchall()}
    for event in events:
        row = saved.get(event['id'])
        if row is None or row['user_id']!=event.get('user_id'):
            continue
        event['location_permission'] = row['status']
        if row['status']!='GRANTED':
            continue
        lat,lon = row['latitude'],row['longitude']
        event.update(latitude=lat,longitude=lon,city=None,country=None,
            location=f'{lat:.4f}°, {lon:.4f}°', location_basis='BROWSER_REPORTED',
            accuracy_m=row['accuracy_m'],location_captured_at=row['captured_at'])
    return events
