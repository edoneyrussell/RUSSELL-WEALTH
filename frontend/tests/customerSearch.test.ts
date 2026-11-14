import test from 'node:test';
import assert from 'node:assert/strict';
import { customerSearchPages, matchCustomerResults } from '../src/utils/customerSearch.ts';
import { marketCountdown } from '../src/utils/marketCountdown.ts';

test('customer search finds sections by names and everyday actions', () => {
  for (const [query, href] of [['password hint','/customer/settings'], ['buy','/markets'], ['deposit','/deposit'], ['allocation','/portfolio'], ['watchlist','/dashboard#watchlist'], ['transactions','/transactions']]) {
    assert.ok(matchCustomerResults(customerSearchPages, query).some(result => result.href === href), query);
  }
  assert.ok(customerSearchPages.every(result => !result.href.startsWith('/security')));
});
test('search matches private records by partial names, symbols and amounts', () => {
  const record = {key:'holding:AAPL',title:'AAPL · Apple Inc.',detail:'Your holdings · 15 units · CAD 10000',href:'/portfolio?search=AAPL',kind:'Holding'};
  assert.deepEqual(matchCustomerResults([record], 'app'), [record]);
  assert.deepEqual(matchCustomerResults([record], 'AAPL 10000'), [record]);
  assert.deepEqual(matchCustomerResults([record], 'MSFT'), []);
});
test('countdowns respect exchange timestamps and never go negative', () => {
  const now = Date.parse('2026-11-14T03:00:00Z');
  const nasdaq = marketCountdown('2026-11-15T20:00:00-05:00', now);
  const tsx = marketCountdown('2026-11-16T09:30:00-05:00', now);
  assert.equal(nasdaq?.text, '1d 22h 00m 00s');
  assert.equal(tsx?.text, '2d 11h 30m 00s');
  assert.notEqual(nasdaq?.seconds, tsx?.seconds);
  assert.equal(marketCountdown('2026-11-14T03:00:01Z',now)?.seconds, 1);
  assert.equal(marketCountdown('2026-11-13T03:00:00Z',now)?.seconds, 0);
  assert.equal(marketCountdown(null,now), null);
  assert.equal(marketCountdown('invalid',now), null);
});
