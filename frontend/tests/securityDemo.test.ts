import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoModuleResponse } from '../src/demo/securityDemoModules.ts';
import { demoSections,demoSecurityLink,demoSection } from '../src/demo/securityDemoNavigation.ts';
import { securityDemoSteps,securityDemoIntroduction } from '../src/onboarding/securityDemoSteps.ts';
const url=(path:string)=>new URL(path,'https://demo.invalid');
test('every SOC module has a public sandbox destination; private and external routes cannot escape',()=>{
  for(const section of demoSections)assert.equal(demoSection(`section=${encodeURIComponent(section)}`),section);
  assert.equal(demoSecurityLink('/security/sessions'),'/demo/security?section=Active+Sessions');
  assert.equal(demoSection('panel=logs'),'Logs');
  for(const path of ['/api/security/users','/dashboard','https://example.com','/security/unknown'])assert.equal(demoSecurityLink(path),null);
});
test('public preview data disables sensitive account and session controls',async()=>{
  const directory=await demoModuleResponse(url('/api/security/users'),undefined,[])!.json();
  const sessions=await demoModuleResponse(url('/api/security/sessions'),undefined,[])!.json();
  assert.ok(directory.users.length>0&&directory.users.every((row:any)=>!row.manageable&&row.email.endsWith('@example.com')));
  assert.ok(sessions.sessions.every((row:any)=>!row.can_revoke&&row.location_basis==='DEMO'));
  for(const path of ['/api/security/users/1','/api/security/sessions/demo-session-1/revoke','/api/me/profile'])assert.equal(demoModuleResponse(url(path),{method:'POST'},[])!.status,403);
});
test('preview investigation notes and status responses update only fictional timeline state',async()=>{
  const notes=demoModuleResponse(url('/api/security/incidents/2/notes'),{method:'POST',body:JSON.stringify({note:'Reviewed the fictional evidence.'})},[])!;
  assert.equal(notes.status,200);
  assert.equal(demoModuleResponse(url('/api/security/incidents/2/response'),{method:'POST',body:JSON.stringify({action:'UPDATE_STATUS',status:'RESOLVED',reason:'Fictional investigation completed.'})},[])!.status,200);
  const evidence=await demoModuleResponse(url('/api/security/incidents/2/investigation'),undefined,[])!.json();
  assert.ok(evidence.timeline.some((row:any)=>row.details==='Reviewed the fictional evidence.'));
  assert.ok(evidence.timeline.some((row:any)=>row.details==='RESOLVED'));
  assert.equal(evidence.can_manage_accounts,false);
});
test('the complete SOC tour is translated and deployment history is explicitly illustrative',async()=>{
  const fr=JSON.parse(readFileSync(new URL('../src/i18n/fr.json',import.meta.url),'utf8'));
  assert.equal(securityDemoSteps.length,13);assert.ok(fr[securityDemoIntroduction]);
  for(const step of securityDemoSteps){assert.ok(fr[step.title],step.title);assert.ok(fr[step.body],step.body);assert.ok(step.path.startsWith('/demo/security'));}
  const network=await demoModuleResponse(url('/api/security/infrastructure'),undefined,[])!.json();
  assert.deepEqual(network.services.map((row:any)=>row.name),['Vercel','Render','Neon']);
  for(const service of network.services){assert.ok(service.detail.includes('demo'));assert.equal(network.history[service.name].blocks.length,48);}
});
