import test_access
import unittest
from datetime import datetime, timezone
from trading_hours import market_status


def status(symbol, when, kind='STOCK'):
    return market_status(symbol, kind, now=datetime.fromisoformat(when))


class TradingHoursTests(unittest.TestCase):
    def test_regular_session_boundaries_and_weekends(self):
        for when, expected in [('2026-11-13T14:29:59+00:00', False),
                               ('2026-11-13T14:30:00+00:00', True),
                               ('2026-11-13T20:59:59+00:00', True),
                               ('2026-11-13T21:00:00+00:00', False),
                               ('2026-11-14T16:00:00+00:00', False)]:
            self.assertEqual(status('AAPL', when)['is_open'], expected, when)

    def test_daylight_saving_and_holidays(self):
        self.assertTrue(status('AAPL', '2026-07-01T13:30:00+00:00')['is_open'])
        self.assertFalse(status('VFV.TO', '2026-07-01T13:30:00+00:00')['is_open'])
        self.assertFalse(status('AAPL', '2026-07-03T16:00:00+00:00')['is_open'])
        self.assertTrue(status('VFV.TO', '2026-07-03T16:00:00+00:00')['is_open'])
        self.assertFalse(status('AAPL', '2026-11-26T16:00:00+00:00')['is_open'])
        self.assertFalse(status('VFV.TO', '2026-12-28T16:00:00+00:00')['is_open'])
        self.assertTrue(status('AAPL', '2027-12-31T16:00:00+00:00')['is_open'])

    def test_early_close_and_next_open(self):
        self.assertTrue(status('AAPL', '2026-11-27T17:59:59+00:00')['is_open'])
        closed = status('AAPL', '2026-11-27T18:00:00+00:00')
        self.assertFalse(closed['is_open'])
        self.assertEqual(closed['next_open'], '2026-11-30T09:30:00-05:00')
        self.assertFalse(status('VFV.TO', '2026-12-24T18:00:00+00:00')['is_open'])

    def test_crypto_always_open(self):
        self.assertTrue(status('BTC', '2026-12-25T23:00:00+00:00', 'CRYPTO')['is_open'])

    def test_nasdaq_and_tsx_have_different_next_openings(self):
        now = datetime.fromisoformat('2026-11-14T03:00:00+00:00')
        nasdaq = market_status('AAPL', 'STOCK', 'NASDAQ', now=now)
        tsx = market_status('VFV.TO', 'ETF', 'TSX', now=now)
        self.assertEqual(nasdaq['next_open'], '2026-11-15T20:00:00-05:00')
        self.assertEqual(nasdaq['next_session'], 'overnight')
        self.assertEqual(tsx['next_open'], '2026-11-16T09:30:00-05:00')
        self.assertEqual(tsx['next_session'], 'regular')
