import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isTourProgress, welcomeSteps } from '../src/onboarding/steps.ts';

test('persisted progress is bounded and rejects malformed values',()=>{
  for(const value of [null,{}, {status:'active',step:-1},{status:'active',step:13},{status:'active',step:true},{status:'unknown',step:0}])assert.equal(isTourProgress(value),false);
  for(const status of ['none','pending','active','skipped','completed'])assert.equal(isTourProgress({status,step:12}),true);
});
test('every tour step has a real highlight anchor and French copy',()=>{
  const french=JSON.parse(readFileSync(new URL('../src/i18n/fr.json',import.meta.url),'utf8'));
  const files=['screens/Dashboard.tsx','screens/Accounts.tsx','screens/DemoBanking.tsx','screens/PortfolioExperience.tsx','screens/TradeExplore.tsx','screens/Transactions.tsx','screens/CustomerSettings.tsx','components/DashboardWatchlist.tsx'];
  const source=files.map(file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8')).join('\n');
  assert.equal(welcomeSteps.length,13);
  for(const step of welcomeSteps){assert.ok(source.includes(`data-tour="${step.target}"`),step.target);assert.ok(french[step.title],step.title);assert.ok(french[step.body],step.body);}
});
