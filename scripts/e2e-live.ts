import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import type { Incident, Profile, Task, Wage } from '../shared/types';
import { expectedWage } from '../shared/types';
const origin=process.env.TEST_ORIGIN||'http://localhost:8080';
const evidence:string[]=[];
const pass=(name:string)=>{evidence.push(name);console.info(`PASS ${name}`);};
async function login(email:string,password:string){const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const b=await r.json();assert.equal(r.status,200,'Real Firebase login');return b.idToken as string;}
async function call<T>(token:string,path:string,body?:unknown,expected=200,method?:string):Promise<T>{const r=await fetch(origin+'/api'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});const b=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(b.error)}`);return b.data;}
async function main(){
  const worker=await login('worker@bhashabandhu.demo',process.env.DEMO_WORKER_PASSWORD!);
  const contractor=await login('contractor@bhashabandhu.demo',process.env.DEMO_CONTRACTOR_PASSWORD!);
  const hospital=await login('hospital@bhashabandhu.demo',process.env.DEMO_HOSPITAL_PASSWORD!);
  const me=await call<Profile>(worker,'/me');assert.equal(me.role,'worker');
  assert.equal((await call<Profile>(contractor,'/me')).role,'contractor');assert.equal((await call<Profile>(hospital,'/me')).role,'hospital_responder');pass('three real logins and Firebase UID -> live PostgreSQL profile/role mapping');
  await call(worker,'/tasks',{},403);await call(hospital,'/tasks',undefined,403);await call(worker,'/workers',undefined,403);await call('invalid-token','/me',undefined,401);pass('role isolation and invalid session rejection');
  const original={title:'Inspect Zone B walkway',instructions:'Inspect the Zone B walkway. Wear safety shoes. Report any damaged barriers.',safetyNotes:'Wear safety shoes. Do not climb damaged barriers.'};
  const preview=await call<{previewToken:string;translations:Record<string,unknown>}>(contractor,'/tasks/preview',{assignedTo:me.id,sourceLanguage:'en',original});assert.ok(preview.translations.hi&&preview.translations.bn);
  const task=await call<Task>(contractor,'/tasks',{assignedTo:me.id,sourceLanguage:'en',original,location:'Demo site · Zone B',deadline:new Date(Date.now()+7200000).toISOString(),previewToken:preview.previewToken},201);
  assert.ok((await call<Task[]>(worker,'/tasks')).some(t=>t.id===task.id));assert.deepEqual((await call<Task>(worker,`/tasks/${task.id}`)).original,original);pass('real Groq Hindi/Bengali preview, persistent contractor assignment and worker receipt');
  await call(worker,`/tasks/${task.id}/complete`,{},409);
  const ack=await call<Task>(worker,`/tasks/${task.id}/acknowledge`,{});const again=await call<Task>(worker,`/tasks/${task.id}/acknowledge`,{});assert.equal(ack.acknowledgedAt,again.acknowledgedAt);assert.equal((await call<Task[]>(contractor,'/tasks')).find(t=>t.id===task.id)?.status,'acknowledged');
  await call(worker,`/tasks/${task.id}/start`,{});await call(worker,`/tasks/${task.id}/complete`,{});assert.equal((await call<Task[]>(contractor,'/tasks')).find(t=>t.id===task.id)?.status,'completed');pass('acknowledgement, duplicate idempotency, start/completion and cross-role persistence');
  for(const language of ['en','bn','hi']){const p=await call<Profile>(worker,'/me/language',{language},200,'PATCH');assert.equal(p.preferredLanguage,language);}pass('three language preferences saved in PostgreSQL');
  const report={originalText:'यह केवल डेमो रिपोर्ट है। ज़ोन B में रास्ते पर मलबा है। कोई घायल नहीं है।',sourceLanguage:'hi',category:'hazard',urgency:'high',location:'Demo site · Zone B',requestId:randomUUID()};
  const incident=await call<Incident>(worker,'/incidents',report,201);assert.ok(incident.englishTranslation);assert.equal(incident.urgency,'high');assert.equal(incident.originalText,report.originalText);
  assert.equal((await call<Incident>(worker,'/incidents',report,201)).id,incident.id);
  assert.ok((await call<Incident[]>(contractor,'/incidents')).some(i=>i.id===incident.id));assert.ok((await call<Incident[]>(hospital,'/incidents')).some(i=>i.id===incident.id));pass('Hindi incident translation, source/urgency preservation, deduplication and shared real inboxes');
  await call(worker,`/incidents/${incident.id}/acknowledge-demo`,{},403);await call(contractor,`/incidents/${incident.id}/review`,{});
  const acknowledged=await call<Incident>(hospital,`/incidents/${incident.id}/acknowledge-demo`,{});const duplicate=await call<Incident>(hospital,`/incidents/${incident.id}/acknowledge-demo`,{});assert.equal(acknowledged.events.length,duplicate.events.length);
  assert.equal((await call<Incident>(worker,`/incidents/${incident.id}`)).status,'acknowledged_demo');await call(hospital,`/incidents/${incident.id}/follow-up-demo`,{});await call(hospital,`/incidents/${incident.id}/close-demo`,{});
  const closed=await call<Incident>(worker,`/incidents/${incident.id}`);assert.equal(closed.status,'closed_demo');assert.equal(closed.events.length,5);pass('demo review/acknowledgement/follow-up/close, durable audit history and duplicate protection');
  const wage=await call<Wage>(contractor,'/wages',{workerId:me.id,workDate:'2026-10-27',dailyRate:700,daysWorked:2,overtimeHours:2,overtimeRate:100,deductions:50,deductionReason:'Synthetic training example',paidAmount:500,source:'recorded'},201);assert.equal(expectedWage(wage),1550);assert.ok((await call<Wage[]>(worker,'/wages')).some(w=>w.id===wage.id));await call(worker,`/wages/${wage.id}/dispute`,{});assert.equal((await call<Wage[]>(contractor,'/wages')).find(w=>w.id===wage.id)?.disputed,true);pass('persistent wage entries, estimated calculation and worker discrepancy flag');
  await call(worker,'/incidents',{},400);await call(contractor,'/tasks',{...original,role:'contractor'},400);pass('invalid form and malformed assignment rejection');
  const fresh=await login('worker@bhashabandhu.demo',process.env.DEMO_WORKER_PASSWORD!);assert.equal((await call<Task>(fresh,`/tasks/${task.id}`)).status,'completed');assert.equal((await call<Incident>(fresh,`/incidents/${incident.id}`)).status,'closed_demo');pass('fresh login retains task and incident state from real PostgreSQL');
  await mkdir('test-results',{recursive:true});await writeFile('test-results/live-e2e.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),passed:evidence,taskId:task.id,incidentId:incident.id,wageId:wage.id},null,2));
}
main().catch(error=>{console.error('FAIL live E2E:',error.message);process.exitCode=1;});
