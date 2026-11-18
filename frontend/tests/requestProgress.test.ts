import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestProgress } from '../src/loading/requestProgress.ts';

test('progress advances only when actual work finishes, including concurrent requests', () => {
  const tracker = createRequestProgress();
  const first = tracker.start();
  const second = tracker.start();
  assert.deepEqual(tracker.snapshot(), {total:2, completed:0, visible:true});
  first();
  assert.deepEqual(tracker.snapshot(), {total:2, completed:1, visible:true});
  const third = tracker.start();
  assert.deepEqual(tracker.snapshot(), {total:3, completed:1, visible:true});
  second(); third();
  assert.deepEqual(tracker.snapshot(), {total:3, completed:3, visible:true});
});
test('a failed or aborted request settles once and a later batch starts fresh', () => {
  const tracker = createRequestProgress();
  const finish = tracker.start();
  finish(); finish();
  assert.equal(tracker.snapshot().completed, 1);
  const next = tracker.start();
  assert.deepEqual(tracker.snapshot(), {total:1, completed:0, visible:true});
  next();
});
test('completed batches disappear and subscriptions can be released', async () => {
  const tracker = createRequestProgress();
  let updates = 0;
  const unsubscribe = tracker.subscribe(() => updates++);
  tracker.start()();
  assert.equal(updates, 2);
  unsubscribe();
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(tracker.snapshot().visible, false);
  assert.equal(updates, 2);
});

test('background polling stays quiet while new pages and mutations get progress', async () => {
  const {createRequestPolicy}=await import('../src/loading/requestProgress.ts');
  const track=createRequestPolicy();
  assert.equal(track('/security','/api/security/overview'),true);
  assert.equal(track('/security','/api/security/overview'),false);
  assert.equal(track('/security','/api/me/session-heartbeat'),false);
  assert.equal(track('/security','/api/security/alerts/1','PATCH'),true);
  assert.equal(track('/portfolio','/api/customer/portfolio?account_id=all'),true);
  assert.equal(track('/portfolio','/api/customer/portfolio?account_id=2'),true);
  assert.equal(track('/portfolio','/api/customer/portfolio?account_id=2'),false);
});
