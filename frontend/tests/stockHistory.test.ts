import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePriceHistory, priceHistoryRange } from '../src/utils/stockHistory.ts';

test('normalizes daily prices without inventing missing days', () => {
  assert.deepEqual(normalizePriceHistory([
    {date:'2026-11-13',close:'250'}, {date:'2026-11-11',close:100},
    {date:'2026-11-12',close:0}, {date:'invalid',close:50}, {date:'2026-11-10',close:'NaN'},
  ]), [{date:'2026-11-11',close:100},{date:'2026-11-13',close:250}]);
  assert.deepEqual(normalizePriceHistory(null), []);
});

test('All retains the oldest prices and shorter ranges use calendar days', () => {
  const history = normalizePriceHistory([
    {date:'2025-01-01',close:30}, {date:'2026-11-06',close:80},
    {date:'2026-11-07',close:50}, {date:'2026-11-13',close:100},
  ]);
  assert.deepEqual(priceHistoryRange(history, 'ALL'), history);
  assert.deepEqual(priceHistoryRange(history, '1W'), history.slice(2));
  assert.deepEqual(priceHistoryRange(history, '1Y'), history.slice(1));
  assert.deepEqual(priceHistoryRange([], '1M'), []);
});
