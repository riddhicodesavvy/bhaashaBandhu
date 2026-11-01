import 'dotenv/config';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = 'https://bhaasha-bandhu.vercel.app';
const evidence = { at: new Date().toISOString(), base, fixture: 'Synthetic coordinates for persistence testing, NOT physical GPS capture', checks: [] };
function save(name, result) { evidence.checks.push({ name, ...result }); fs.writeFileSync('test-results/gps-production.json', JSON.stringify(evidence, null, 2)); console.log(name, JSON.stringify(result)); }
async function api(path, token, body) {
  const start=performance.now();
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
  return {status:r.status,ms:Math.round(performance.now()-start),body:await r.json(),requestId:r.headers.get('x-vercel-id')};
}
const cfg=(await api('/api/config')).body.data;
async function login(role) {
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.firebase.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${role}@bhashabandhu.demo`,password:process.env[`DEMO_${role.toUpperCase()}_PASSWORD`],returnSecureToken:true})});
 const d=await r.json();assert.ok(d.idToken,`Login failed for ${role}`);return d.idToken;
}
const tokens={};for(const role of ['worker','contractor','hospital'])tokens[role]=await login(role);
const report={originalText:'GPS FEATURE AUDIT: Loose cable in generator room. Synthetic location fixture, not device GPS.',sourceLanguage:'en',category:'hazard',urgency:'medium',location:'GPS TEST: Generator room, Kattankulathur (synthetic location)',latitude:12.823,longitude:80.044,requestId:randomUUID()};
const anon=await api('/api/incidents',null,report);save('anonymous incident rejected',anon);assert.equal(anon.status,401);
for(const value of [{latitude:'12.823',longitude:80.044},{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:null,longitude:null},{latitude:12.823,longitude:undefined}]) {
 const result=await api('/api/incidents',tokens.worker,{...report,...value,requestId:randomUUID()});save('invalid coordinates rejected',{input:value,...result});assert.equal(result.status,400);
}
const created=await api('/api/incidents',tokens.worker,report);save('create GPS fixture',created);assert.equal(created.status,201);const id=created.body.data.id;
const duplicate=await api('/api/incidents',tokens.worker,report);save('retry same incident',duplicate);assert.equal(duplicate.body.data.id,id);
for(const role of Object.keys(tokens)) {
 const list=await api('/api/incidents',tokens[role]);assert.equal(list.status,200);const matches=list.body.data.filter(x=>x.id===id);assert.equal(matches.length,1);
 const r=matches[0];assert.equal(r.latitude,report.latitude);assert.equal(r.longitude,report.longitude);assert.equal(r.location,report.location);save(`cross role ${role}`,{status:list.status,record:r});
}
const reviewed=await api(`/api/incidents/${id}/review`,tokens.contractor,{});save('contractor review preserves location',reviewed);assert.equal(reviewed.status,200);
for(const role of Object.keys(tokens)) {
 const token=await login(role);const result=await api(`/api/incidents/${id}`,token);save(`fresh login ${role}`,result);assert.equal(result.status,200);assert.equal(result.body.data.latitude,report.latitude);assert.equal(result.body.data.longitude,report.longitude);assert.equal(result.body.data.location,report.location);
}
const r=await fetch(process.env.SUPABASE_GATEWAY_URL,{method:'POST',headers:{Authorization:`Bearer ${tokens.worker}`,'Content-Type':'application/json',apikey:process.env.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({operation:'get',kind:'incident',id:`incident:${id}`})});const direct=await r.json();save('direct Supabase gateway',{status:r.status,body:direct});assert.equal(r.status,200);assert.equal(typeof direct.data.payload.latitude,'number');assert.equal(direct.data.payload.latitude,report.latitude);assert.equal(direct.data.payload.longitude,report.longitude);
const forbidden=await api('/api/workers',tokens.worker);save('worker RBAC preserved',forbidden);assert.equal(forbidden.status,403);
const hospitalTask=await api('/api/tasks',tokens.hospital,{});save('hospital RBAC preserved',hospitalTask);assert.equal(hospitalTask.status,403);
for(const role of ['worker','contractor']) {const tasks=await api('/api/tasks',tokens[role]);save(`existing tasks ${role}`,{status:tasks.status,count:tasks.body.data?.length});assert.equal(tasks.status,200);}
const form=new FormData();form.append('audio',new Blob([fs.readFileSync('test-results/audit-rods.wav')],{type:'audio/wav'}),'audit-rods.wav');form.append('language','en');const speech=await api('/api/audio/transcribe',tokens.worker,form);save('Whisper regression',speech);assert.equal(speech.status,200);assert.match(speech.body.data.text,/steel rods/i);
const analysis=await api('/api/incidents/analyze',tokens.worker,{text:speech.body.data.text,language:'en'});save('Groq regression',analysis);assert.equal(analysis.status,200);assert.ok(analysis.body.data.category);
const html=await fetch(base+'/worker/report');save('document geolocation policy',{status:html.status,permissionsPolicy:html.headers.get('permissions-policy')});assert.match(html.headers.get('permissions-policy'),/geolocation=\(self\)/);
save('complete',{at:new Date().toISOString(),incidentId:id});
