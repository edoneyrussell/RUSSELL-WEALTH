import assert from 'node:assert/strict';
import test from 'node:test';
import { profileInitials } from '../src/utils/profileInitials.ts';
test('initials use each customer’s first and last names',()=>{
  assert.equal(profileInitials('Joey Egg'),'JE');
  assert.equal(profileInitials('Alice Beth Cooper'),'AC');
  assert.equal(profileInitials('  BIG   BRO '),'BB');
  assert.equal(profileInitials('Élodie Martin'),'ÉM');
  assert.equal(profileInitials('Sam'),'S');
  assert.equal(profileInitials(''),'?');
});
