"""Exchange-local sessions with DST, holidays, breaks and Nasdaq simulation nights.

Calendar rules: https://www.nyse.com/trade/hours-calendars and
https://www.tsx.com/en/trading/calendars-and-trading-hours/calendar
Only Nasdaq has an optional simulated overnight session, 20:00–04:00 ET.
"""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from functools import lru_cache
from pathlib import Path
import json
from exchanges import EXCHANGES, exchange_code

EASTERN = ZoneInfo('America/New_York')


def nth_weekday(year, month, weekday, occurrence):
    first = date(year, month, 1)
    return first + timedelta(days=(weekday - first.weekday()) % 7 + 7 * (occurrence - 1))


def easter(year):
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    n = h + l - 7 * m + 114
    return date(year, n // 31, n % 31 + 1)


def observed(day):
    return day + timedelta(days=2 if day.weekday() == 5 else 1 if day.weekday() == 6 else 0)


def holidays(year, canadian=False):
    good_friday = easter(year) - timedelta(days=2)
    labor = nth_weekday(year, 9, 0, 1)
    if canadian:
        victoria = date(year, 5, 24)
        victoria -= timedelta(days=victoria.weekday())
        days = {observed(date(year, 1, 1)), nth_weekday(year, 2, 0, 3), good_friday,
                victoria, observed(date(year, 7, 1)), nth_weekday(year, 8, 0, 1),
                labor, nth_weekday(year, 10, 0, 2)}
        for day in (date(year, 12, 25), date(year, 12, 26)):
            while day.weekday() >= 5 or day in days:
                day += timedelta(days=1)
            days.add(day)
        return days
    def us_observed(day):
        return day - timedelta(days=1) if day.weekday() == 5 else observed(day)
    new_year = date(year, 1, 1)
    # NYSE does not observe a Saturday New Year's Day on the preceding Friday.
    days = {observed(new_year) if new_year.weekday() == 6 else new_year,
            nth_weekday(year, 1, 0, 3), nth_weekday(year, 2, 0, 3), good_friday,
            nth_weekday(year, 6, 0, 1) - timedelta(days=7),
            us_observed(date(year, 6, 19)), us_observed(date(year, 7, 4)),
            labor, nth_weekday(year, 11, 3, 4), us_observed(date(year, 12, 25))}
    return days


@lru_cache(maxsize=1)
def regional_calendars():
    return json.loads((Path(__file__).parent / 'data' / 'exchange_calendars.json').read_text())


def regional_holidays(year, code):
    if code in ('TSE', 'HKEX'):
        calendar = regional_calendars()[code].get(str(year))
        return None if calendar is None else {date.fromisoformat(f'{year}-{day}') for day in calendar['closed']}
    if code == 'TSX':
        return holidays(year, True)
    if code in ('NASDAQ', 'NYSE', 'AMEX', 'CBOE', 'US'):
        return holidays(year)
    days = {observed(date(year, 1, 1)), easter(year) - timedelta(days=2), easter(year) + timedelta(days=1)}
    if code == 'LSE':
        days.update((nth_weekday(year, 5, 0, 1), nth_weekday(year, 6, 0, 1) - timedelta(days=7),
                     nth_weekday(year, 9, 0, 1) - timedelta(days=7)))
    elif code == 'ASX':
        days.update((observed(date(year, 1, 26)), date(year, 4, 25), nth_weekday(year, 6, 0, 2)))
    for day in (date(year, 12, 25), date(year, 12, 26)):
        while day.weekday() >= 5 or day in days:
            day += timedelta(days=1)
        days.add(day)
    return days


def day_sessions(day, code):
    closed = regional_holidays(day.year, code)
    if closed is None or day.weekday() >= 5 or day in closed:
        return []
    if code in ('TSE', 'HKEX'):
        half = day.strftime('%m-%d') in regional_calendars()[code][str(day.year)]['half_days']
        hours = [(9, 0, 11, 30), (12, 30, 15, 30)] if code == 'TSE' else [(9, 30, 12, 0)] + ([] if half else [(13, 0, 16, 0)])
    elif code == 'LSE':
        hours = [(8, 0, 12, 30)] if (day.month, day.day) in ((12, 24), (12, 31)) else [(8, 0, 16, 30)]
    elif code == 'ASX':
        hours = [(10, 0, 14, 10)] if (day.month, day.day) in ((12, 24), (12, 31)) else [(10, 0, 16, 0)]
    else:
        early = day.month == 12 and day.day == 24
        if code != 'TSX':
            early |= day.month == 7 and day.day == 3
            early |= day == nth_weekday(day.year, 11, 3, 4) + timedelta(days=1)
        hours = [(9, 30, 13 if early else 16, 0)]
    zone = ZoneInfo(EXCHANGES[code]['zone'])
    return [(datetime.combine(day, time(h1, m1), zone), datetime.combine(day, time(h2, m2), zone), 'regular')
            for h1, m1, h2, m2 in hours]


def exchange_status(code, now=None):
    market = EXCHANGES[code]
    now = (now or datetime.now(timezone.utc)).astimezone(ZoneInfo(market['zone']))
    base = dict(exchange=code, market=code, timezone=market['zone'], checked_at=now.isoformat())
    if code == 'CRYPTO':
        return dict(base, is_open=True, session='continuous', is_simulated_session=False,
                    message='Crypto trading is available 24/7.', next_open=None, closes_at=None)
    if regional_holidays(now.year, code) is None:
        return dict(base, is_open=False, session='unavailable', is_simulated_session=False,
                    message=f'{code} calendar unavailable for {now.year}.', next_open=None, closes_at=None)
    sessions = []
    for offset in range(-1, 16):
        day = now.date() + timedelta(days=offset)
        regular = day_sessions(day, code)
        sessions.extend(regular)
        # A night session belongs to the following valid trading day. No Friday/Saturday nights.
        if code == 'NASDAQ' and regular:
            start = datetime.combine(day - timedelta(days=1), time(20), EASTERN)
            end = datetime.combine(day, time(4), EASTERN)
            sessions.append((start, end, 'overnight'))
    active = next((item for item in sessions if item[0] <= now < item[1]), None)
    following = sorted((item for item in sessions if item[0] > now), key=lambda item: item[0])
    next_open = following[0][0] if following else None
    next_session = following[0][2] if following else None
    if active:
        label = 'simulated night session open' if active[2] == 'overnight' else 'market open'
        message = f'{code} {label} until {active[1].strftime("%H:%M %Z")}.'
    else:
        label = 'simulated night session' if next_session == 'overnight' else 'session'
        message = f'{code} market closed.' + (f' Next {label}: {next_open.strftime("%a, %b %d at %H:%M %Z")}.' if next_open else '')
    return dict(base, is_open=bool(active), session=active[2] if active else 'closed',
                is_simulated_session=bool(active and active[2] == 'overnight'),
                message=message, next_open=next_open.isoformat() if not active and next_open else None,
                next_session=next_session if not active else None,
                closes_at=active[1].isoformat() if active else None)


def market_status(symbol, asset_type='STOCK', exchange='', now=None):
    return exchange_status(exchange_code(symbol, asset_type, exchange), now)
