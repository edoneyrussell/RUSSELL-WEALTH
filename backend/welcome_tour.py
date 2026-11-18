"""Account-owned onboarding progress. Only registration enrolls users automatically."""
from flask import Blueprint, jsonify, request, session
from database import get_db_connection
from authorization import role_required
from access_api import valid_origin

welcome_tour_bp = Blueprint('welcome_tour', __name__)
TOUR_STEPS = 13


def initialize_welcome_tour():
    db = get_db_connection()
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS customer_welcome_tours (
            user_id INTEGER PRIMARY KEY,
            status TEXT NOT NULL,
            step INTEGER NOT NULL DEFAULT 0
        )''')
        db.commit()
    finally:
        db.close()


def enroll_welcome_tour(db, email):
    # Called in the same transaction as account creation, never on ordinary login.
    db.execute('''INSERT INTO customer_welcome_tours(user_id, status, step)
        SELECT id, 'pending', 0 FROM users WHERE lower(email)=?
        ON CONFLICT(user_id) DO NOTHING''', (email,))


@welcome_tour_bp.route('/api/customer/welcome-tour', methods=['GET', 'PUT'])
@role_required('CUSTOMER')
def welcome_tour():
    db = get_db_connection()
    try:
        if request.method == 'PUT':
            if not valid_origin():
                return jsonify(error='Request origin denied'), 403
            data = request.get_json(silent=True)
            if not isinstance(data, dict) or set(data) != {'status', 'step'}:
                return jsonify(error='Invalid tour progress'), 400
            status, step = data['status'], data['step']
            if (status not in ('active', 'skipped', 'completed')
                    or type(step) is not int or not 0 <= step < TOUR_STEPS
                    or (status == 'completed' and step != TOUR_STEPS - 1)):
                return jsonify(error='Invalid tour progress'), 400
            db.execute('''INSERT INTO customer_welcome_tours(user_id, status, step)
                VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE
                SET status=excluded.status, step=excluded.step''',
                (session['user_id'], status, step))
            db.commit()
        row = db.execute('SELECT status, step FROM customer_welcome_tours WHERE user_id=?',
                         (session['user_id'],)).fetchone()
        result=dict(row) if row else {'status':'none','step':0}
        if request.method=='GET':
            # Only the registration sign-in may claim the automatic invitation.
            # An unfinished tour must never reopen on a later login or reload.
            result={'status':'none','step':0}
            if row and row['status']=='pending' and session.get('welcome_tour_first_login') is True:
                claim=db.execute("UPDATE customer_welcome_tours SET status='offered' WHERE user_id=? AND status='pending'",(session['user_id'],))
                db.commit()
                if claim.rowcount:
                    session.pop('welcome_tour_first_login',None)
                    result={'status':'pending','step':0}
        return jsonify(result), 200, {'Cache-Control': 'no-store'}
    finally:
        db.close()
