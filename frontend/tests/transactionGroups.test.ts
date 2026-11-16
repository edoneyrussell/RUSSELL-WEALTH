import assert from 'node:assert/strict';
import test from 'node:test';
import { groupTransactions } from '../src/utils/transactionGroups.ts';
const entry = (id: number, changes = {}) => ({ id, symbol:'AAPL', action:'BUY', category:'STOCK', quantity:'0.1', total:'0.10', created_at:'2026-11-13T18:00:00Z', ...changes });
test('groups all executions without mixing assets, sides, or days', () => {
  const entries = [entry(1), entry(2), entry(3,{action:'SELL'}), entry(4,{symbol:'MSFT'}), entry(5,{created_at:'2026-11-12T18:00:00Z'}),entry(6)];
  const groups = groupTransactions(entries);
  assert.equal(groups.length,4);
  assert.equal(groups[0].entries.length,3);
  assert.equal(groups[0].total,0.30);
  assert.equal(groups[0].quantity,0.3);
  assert.equal(groups.reduce((sum,g)=>sum+g.entries.length,0),entries.length);
});
test('bank transfers remain individual and fractional crypto is preserved',()=>{
  const groups=groupTransactions([entry(1,{action:'DEPOSIT'}),entry(2,{action:'DEPOSIT'}),entry(3,{symbol:'BTC',category:'CRYPTO',quantity:'0.00000001'}),entry(4,{symbol:'BTC',category:'CRYPTO',quantity:'0.00000002'})]);
  assert.equal(groups.length,3);
  assert.equal(groups[2].quantity,0.00000003);
});

test('same-day trades in different accounts stay separate in all-account history', () => {
  const groups = groupTransactions([entry(1, {account_id: 2}), entry(2, {account_id: 7}), entry(3, {account_id: 2})]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].entries.length, 2);
  assert.equal(groups[1].entries.length, 1);
});
