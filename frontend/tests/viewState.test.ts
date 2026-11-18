import assert from 'node:assert/strict';
import test from 'node:test';
import { readViewState,clearViewMemory } from '../src/experience/ViewState.ts';
const storage:Record<string,string>={};
Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:new Proxy(storage,{get(target,key){if(key==='getItem')return (name:string)=>target[name]??null;if(key==='removeItem')return (name:string)=>{delete target[name];};return target[String(key)];}})});
test('view memory handles invalid storage and accepts only valid account scopes',()=>{
  storage['rw-view:portfolio:account']='2';
  assert.equal(readViewState('portfolio:account','all'),2);
  storage['rw-view:portfolio:account']='-1';
  assert.equal(readViewState('portfolio:account','all'),'all');
  storage['rw-view:portfolio:search']='{"bad":true}';
  assert.equal(readViewState('portfolio:search',''),'');
  storage['rw-view:portfolio:search']='broken-json';
  assert.equal(readViewState('portfolio:search',''),'');
});
test('logout clearing removes view choices without removing unrelated preferences',()=>{
  storage['rw-view:portfolio:search']='"MSFT"';storage['rw-language']='fr';
  clearViewMemory();
  assert.equal(readViewState('portfolio:search',''),'');
  assert.equal(storage['rw-language'],'fr');
});
