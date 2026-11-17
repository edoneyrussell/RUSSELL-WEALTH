import assert from 'node:assert/strict';
import test from 'node:test';
import { threatBuckets } from '../src/utils/threatTrends.ts';
const now = Date.parse('2026-11-16T23:12:00Z');
test('empty activity retains a complete 24-hour zero baseline', () => {
  const buckets = threatBuckets([], now);
  assert.equal(buckets.length,24);
  assert.equal(buckets[23].timestamp,Date.parse('2026-11-16T23:00:00Z'));
  assert.ok(buckets.every(bucket=>bucket.total===0 && bucket.failed===0 && bucket.successful===0));
});
test('server totals are retained including counts above the recent-event limit', () => {
  const buckets = threatBuckets([{hour:'2026-11-16T22:00:00Z',total:140,failed:30,successful:110}],now);
  assert.equal(buckets[22].total,140);
  assert.equal(buckets[22].successful,110);
  assert.equal(buckets[23].total,0);
});
test('UTC, database timestamps and explicit offsets align to the same hour', () => {
  for (const hour of ['2026-11-16T23:00:00Z','2026-11-16 23:00:00','2026-11-16T17:00:00-06:00']) {
    assert.equal(threatBuckets([{hour,total:4,failed:1,successful:3}],now)[23].total,4);
  }
});
test('the rolling window drops old and invalid buckets and never emits invalid counts', () => {
  const trends=[{hour:'2026-11-15T23:00:00Z',total:100,failed:10,successful:90},{hour:'bad',total:100,failed:0,successful:100},{hour:'2026-11-16T23:00:00Z',total:NaN,failed:-1,successful:Infinity}];
  assert.ok(threatBuckets(trends,now).every(bucket=>bucket.total===0 && bucket.failed===0 && bucket.successful===0));
});
