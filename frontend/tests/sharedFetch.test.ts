import assert from 'node:assert/strict';
import test from 'node:test';
import { createSharedFetch } from '../src/experience/sharedFetch.ts';
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>resolve=done);return {promise,resolve};}
test('concurrent reads coalesce, responses have independent bodies, and completed data is not cached',async()=>{
  let calls=0;const gate=deferred<Response>();
  const request=createSharedFetch(async()=>{calls++;return calls===1?gate.promise:Response.json({value:2});});
  const first=request('/api/customer/accounts'),second=request('/api/customer/accounts');
  assert.equal(calls,1);gate.resolve(Response.json({value:1}));
  assert.deepEqual(await(await first).json(),{value:1});assert.deepEqual(await(await second).json(),{value:1});
  assert.deepEqual(await(await request('/api/customer/accounts')).json(),{value:2});assert.equal(calls,2);
});
test('cancelling a subscriber does not cancel another subscriber',async()=>{
  const gate=deferred<Response>();const request=createSharedFetch(()=>gate.promise);const controller=new AbortController();
  const first=request('/api/customer/portfolio',{signal:controller.signal});const second=request('/api/customer/portfolio');
  const rejected=assert.rejects(first,{name:'AbortError'});controller.abort();await rejected;
  gate.resolve(Response.json({cash_balance:'50'}));assert.equal((await(await second).json()).cash_balance,'50');
});
test('scope changes and writes never join a read from an older generation',async()=>{
  let reads=0,writes=0;const gate=deferred<Response>();
  const request=createSharedFetch(async(_url,init)=>{if(init?.method==='POST'){writes++;return Response.json({success:true});}reads++;return reads===1?gate.promise:Response.json({revision:reads});});
  const old=request('/api/customer/portfolio?account_id=1');
  await request('/api/customer/portfolio?account_id=2');
  await request('/api/customer/trade',{method:'POST'});
  const fresh=await request('/api/customer/portfolio?account_id=1');assert.equal((await fresh.json()).revision,3);
  gate.resolve(Response.json({revision:1}));await old;assert.equal(writes,1);assert.equal(reads,3);
});
test('failed work is released so retry performs a fresh request',async()=>{
  let calls=0;const request=createSharedFetch(async()=>{if(++calls===1)throw new Error('offline');return Response.json({ok:true});});
  await assert.rejects(request('/api/security/overview'),/offline/);assert.deepEqual(await(await request('/api/security/overview')).json(),{ok:true});
});
