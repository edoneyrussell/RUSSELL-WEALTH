import test from 'node:test';
import assert from 'node:assert/strict';
import { getGreeting } from '../src/utils/greeting.ts';
test('night greeting starts at 8:30pm and lasts until morning',()=>{
  for(const [hour,minute,expected] of [[20,29,'Good Evening'],[20,30,'Good Night'],[23,59,'Good Night'],[0,0,'Good Night'],[5,0,'Good Morning'],[12,0,'Good Afternoon']] as const)
    assert.equal(getGreeting(new Date(2026,10,13,hour,minute)),expected);
});
