import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPositionAllocation } from '../src/utils/portfolioAllocation.ts';

const holdings = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'VOO', 'BTC', 'AMZN', 'META', 'IBM', 'GOOG', 'BND'].map((symbol, index) => ({
  symbol, name: `${symbol} holding`, quantity: '2', market_value: String((index + 1) * 100),
}));

test('every holding has its own allocation colour and the weights sum to 100', () => {
  const allocation = buildPositionAllocation(holdings);
  assert.equal(allocation.length, holdings.length);
  assert.equal(new Set(allocation.map(item => item.color)).size, holdings.length);
  assert.ok(Math.abs(allocation.reduce((sum, item) => sum + item.weight, 0) - 100) < 1e-10);
  assert.equal(allocation[0].symbol, 'BND');
  assert.equal(allocation.reduce((sum, item) => sum + item.value, 0), 6600);
});

test('updated holdings recalculate values and weights without changing their colours', () => {
  const before = buildPositionAllocation(holdings);
  const after = buildPositionAllocation(holdings.toReversed().map(item => item.symbol === 'AAPL' ? {...item, market_value: '10000'} : item));
  assert.equal(after[0].symbol, 'AAPL');
  assert.ok(after[0].weight > 50);
  for (const item of after) assert.equal(item.color, before.find(old => old.symbol === item.symbol)?.color);
  assert.equal(buildPositionAllocation(holdings.slice(1)).length, holdings.length - 1);
});

test('empty and unfunded positions produce no invalid percentages', () => {
  assert.deepEqual(buildPositionAllocation([]), []);
  const positions = buildPositionAllocation([{...holdings[0], market_value: '0'}]);
  assert.equal(positions[0].weight, 0);
});
