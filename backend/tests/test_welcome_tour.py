"""Enrollment and progress belong to the signed-in customer across sessions."""
import unittest
import test_access
import database


class WelcomeTourTests(unittest.TestCase):
    setUpClass = classmethod(test_access.AccessTests.setUpClass.__func__)
    tearDownClass = classmethod(test_access.AccessTests.tearDownClass.__func__)
    client = test_access.AccessTests.client

    def setUp(self):
        test_access.AccessTests.setUp(self)
        db = database.get_db_connection()
        db.execute('DELETE FROM customer_welcome_tours')
        db.commit()
        db.close()

    def test_registration_enrolls_and_existing_accounts_are_not_interrupted(self):
        self.assertEqual(self.customer.get('/api/customer/welcome-tour').json, {'status':'none','step':0})
        visitor = self.app.test_client()
        result = visitor.post('/api/register/start', json=dict(firstName='Tour', lastName='Learner',
            email='tour-learner@example.com', password='long-tour-test-password', acceptedTerms=True))
        self.assertEqual(result.status_code,201,result.json)
        self.assertEqual(visitor.get('/api/customer/welcome-tour').json, {'status':'pending','step':0})
        self.assertEqual(self.customer.get('/api/customer/welcome-tour').json['status'],'none')

    def test_progress_is_saved_but_manual_replay_is_required(self):
        for state in ({'status':'active','step':4}, {'status':'skipped','step':4},
                      {'status':'active','step':0}, {'status':'completed','step':12}):
            result = self.customer.put('/api/customer/welcome-tour',json=state)
            self.assertEqual(result.status_code,200,result.json)
            self.assertEqual(self.client(103,'CUSTOMER').get('/api/customer/welcome-tour').json,{'status':'none','step':0})
            db=database.get_db_connection()
            self.assertEqual(dict(db.execute('SELECT status,step FROM customer_welcome_tours WHERE user_id=103').fetchone()),state)
            db.close()
        db = database.get_db_connection()
        db.execute("INSERT INTO users(id,name,email,password_hash,role) VALUES(104,'Other','other-tour@example.com',?,'CUSTOMER')",(self.password_hash,))
        db.commit();db.close()
        self.assertEqual(self.client(104,'CUSTOMER').get('/api/customer/welcome-tour').json['status'],'none')

    def test_permissions_origin_and_progress_are_validated(self):
        self.assertEqual(self.app.test_client().get('/api/customer/welcome-tour').status_code,401)
        self.assertEqual(self.admin.get('/api/customer/welcome-tour').status_code,403)
        for data in ({'status':'active','step':True},{'status':'active','step':13},
                     {'status':'active','step':-1},{'status':'pending','step':0},
                     {'status':'completed','step':0},{'status':[],'step':0},
                     {'status':'active','step':0,'user_id':104},[]):
            self.assertEqual(self.customer.put('/api/customer/welcome-tour',json=data).status_code,400)
        self.assertEqual(self.customer.put('/api/customer/welcome-tour',json={'status':'active','step':0},headers={'Origin':'https://untrusted.invalid'}).status_code,403)

    def test_invitation_is_claimed_once_and_never_returns_on_later_login(self):
        from unittest.mock import patch
        visitor=self.app.test_client()
        payload=dict(firstName='First',lastName='Login',email='first-login@example.com',password='long-first-login-password',acceptedTerms=True)
        self.assertEqual(visitor.post('/api/register/start',json=payload).status_code,201)
        self.assertEqual(visitor.get('/api/customer/welcome-tour').json['status'],'pending')
        self.assertEqual(visitor.get('/api/customer/welcome-tour').json['status'],'none')
        self.assertEqual(visitor.put('/api/customer/welcome-tour',json={'status':'active','step':4}).status_code,200)
        visitor.post('/api/logout')
        with patch.object(self.module,'send_login_notification'):
            self.assertEqual(visitor.post('/api/login',json={'email':payload['email'],'password':payload['password']}).status_code,200)
        self.assertEqual(visitor.get('/api/customer/welcome-tour').json['status'],'none')
        # Settings can still explicitly start the tour on this later login.
        self.assertEqual(visitor.put('/api/customer/welcome-tour',json={'status':'active','step':0}).json,{'status':'active','step':0})

    def test_unseen_invitation_does_not_wait_until_a_second_login(self):
        from unittest.mock import patch
        visitor=self.app.test_client()
        payload=dict(firstName='No',lastName='Visit',email='no-tour-visit@example.com',password='long-no-tour-password',acceptedTerms=True)
        self.assertEqual(visitor.post('/api/register/start',json=payload).status_code,201)
        visitor.post('/api/logout')
        with patch.object(self.module,'send_login_notification'):
            self.assertEqual(visitor.post('/api/login',json={'email':payload['email'],'password':payload['password']}).status_code,200)
        self.assertEqual(visitor.get('/api/customer/welcome-tour').json['status'],'none')
