import assert from 'node:assert/strict';
import test from 'node:test';
import { formatReginaAlertTime, severityLabel, statusLabel } from '../src/utils/securityAlerts.ts';
test('alert severity and status retain the recorded meaning',()=>{
  assert.equal(severityLabel('WARNING'),'Warning');
  assert.equal(severityLabel('CRITICAL'),'Critical');
  assert.equal(severityLabel('INFO'),'Info');
  assert.equal(statusLabel('NEW'),'New');
  assert.equal(statusLabel('UNDER_REVIEW'),'Under review');
  assert.equal(statusLabel('RESOLVED'),'Resolved');
});
test('Regina alert timestamps handle UTC, explicit offsets and legacy SQLite times',()=>{
  const expected={date:'Nov 13, 2026',time:'8:30:00 PM'};
  assert.deepEqual(formatReginaAlertTime('2026-11-14T02:30:00Z'),expected);
  assert.deepEqual(formatReginaAlertTime('2026-11-13T20:30:00-06:00'),expected);
  assert.deepEqual(formatReginaAlertTime('2026-11-14 02:30:00'),expected);
  assert.deepEqual(formatReginaAlertTime('invalid'),{date:'—',time:'—'});
});
