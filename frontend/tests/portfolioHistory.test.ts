import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistorySeries } from '../src/utils/portfolioHistory.ts';

const now = 1800000000000;

test('a funded account immediately has a flat line, including with no observations', () => {
  for (const history of [[], [{ time: now, value: 500 }]]) {
    const points = buildHistorySeries(history, 500, '1D', now);
    assert.equal(points.length, 2);
    assert.ok(points[1].time > points[0].time);
    assert.deepEqual(points.map(point => point.value), [500, 500]);
  }
});

test('unfunded or loading accounts do not invent a balance', () => {
  assert.deepEqual(buildHistorySeries([], 0, '1D', now), []);
  assert.deepEqual(buildHistorySeries([], null, '1D', now), []);
});

test('zero balance after withdrawal retains actual history', () => {
  const points = buildHistorySeries([{ time: now - 1000, value: 500 }], 0, '1D', now);
  assert.deepEqual(points.map(point => point.value), [500, 0]);
});

test('ranges with no recent history still show the current funded balance', () => {
  const history = [{ time: now - 10 * 86400000, value: 100 }];
  const points = buildHistorySeries(history, 500, '1D', now);
  assert.deepEqual(points.map(point => point.value), [500, 500]);
  assert.equal(buildHistorySeries(history, 500, 'ALL', now)[0].value, 100);
});

test('invalid history is filtered and shared observations remain unchanged', () => {
  const history = [{ time: now - 1000, value: 500 }, { time: NaN, value: 10 }, { time: now, value: Infinity }];
  const copy = structuredClone(history);
  const points = buildHistorySeries(history, 500, '1D', now);
  assert.deepEqual(points.map(point => point.value), [500, 500]);
  assert.deepEqual(history, copy);
});
