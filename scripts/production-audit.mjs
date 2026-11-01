import 'dotenv/config';
import fs from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
const base = 'https://bhaasha-bandhu.vercel.app';
const evidence = { startedAt: new Date().toISOString(), base, observations: [] };
function save(name, value) { evidence.observations.push({ name, ...value }); fs.writeFileSync(process.env.AUDIT_OUTPUT || 'test-results/production-audit.json', JSON.stringify(evidence, null, 2)); console.log(name, JSON.stringify(value)); }
async function req(path, token, body, method) {
 const start=performance.now(); const r=await fetch(base+path,{method:method || (body ? 'POST':'GET'),headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});
 return {status:r.status,ms:Math.round(performance.now()-start),body:await r.json(),requestId:r.headers.get('x-vercel-id')};
}
const cfg=await req('/api/config');
async function login(role) {
 const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.body.data.firebase.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${role}@bhashabandhu.demo`,password:process.env[`DEMO_${role.toUpperCase()}_PASSWORD`],returnSecureToken:true})});
 const a=await r.json(); if(!a.idToken)throw Error(`Login ${role}: ${a.error?.message}`); return a.idToken;
}
const tokens={}; for(const role of ['worker','contractor','hospital']) {tokens[role]=await login(role);save(`login ${role}`,await req('/api/me',tokens[role]));}
for(const path of ['/api/incidents','/api/tasks','/api/transcribe']) save(`anonymous ${path}`,await req(path,null,path.includes('transcribe')?{}:undefined));
save('worker forbidden contractor data',await req('/api/workers',tokens.worker));
const transcripts={};
for(const [lang,file] of Object.entries({en:'en-test.wav',hi:'hi-test.mp3',bn:'bn-test.mp3',different:'synthetic-report.wav',rods:'audit-rods.wav',random:'audit-random.wav',final:'audit-final.wav'})) {
 const bytes=fs.readFileSync('test-results/'+file); const f=new FormData(); f.append('audio',new Blob([bytes],{type:file.endsWith('wav')?'audio/wav':'audio/mpeg'}),file);f.append('language',['hi','bn'].includes(lang)?lang:'en');
 const result=await req('/api/audio/transcribe',tokens.worker,f);transcripts[lang]=result.body.data?.text;save(`STT ${lang}`,{file,sha256:createHash('sha256').update(bytes).digest('hex'),...result});
}
for(const [name,bytes] of [['empty',Buffer.alloc(0)],['invalid',Buffer.from('this is not audio')],['silence',(()=>{const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b;})()]]) {const f=new FormData();f.append('audio',new Blob([bytes],{type:'audio/wav'}),'test.wav');f.append('language','en');save(`STT failure ${name}`,await req('/api/audio/transcribe',tokens.worker,f));}
for(const [language,text] of [['en','There are 4 steel posts damaged near the second-floor staircase.'],['en','There is water near the electrical board.'],...Object.entries(transcripts).map(([lang,text])=>[['hi','bn'].includes(lang)?lang:'en',text]).filter(x=>x[1])]) save('analysis',{input:text,language,...await req('/api/incidents/analyze',tokens.worker,{text,language})});
const finalText=transcripts.final;
if(!finalText)throw Error('Final real audio transcription failed; refusing to substitute expected text');
const finalAnalysis=await req('/api/incidents/analyze',tokens.worker,{text:finalText,language:'en'});save('final pipeline analysis',finalAnalysis);
if(!finalAnalysis.body.data)throw Error('Final analysis failed; refusing to invent output');
const incidentBody={originalText:finalText,rawTranscript:finalText,sourceLanguage:'en',category:finalAnalysis.body.data.category,urgency:finalAnalysis.body.data.urgency,location:finalAnalysis.body.data.location || 'Generator room',requestId:randomUUID()};
const created=await req('/api/incidents',tokens.worker,incidentBody);save('create incident',created);
const incident=created.body.data;
if(incident?.id){
 save('duplicate retry',await req('/api/incidents',tokens.worker,incidentBody));
 for(const role of Object.keys(tokens)) {const r=await req('/api/incidents',tokens[role]);save(`cross role ${role}`,{status:r.status,record:r.body.data?.find(x=>x.id===incident.id),count:r.body.data?.filter(x=>x.id===incident.id).length});}
 const gateway=process.env.SUPABASE_GATEWAY_URL;
 if(gateway){const r=await fetch(gateway,{method:'POST',headers:{Authorization:`Bearer ${tokens.worker}`,'Content-Type':'application/json',...(process.env.SUPABASE_PUBLISHABLE_KEY?{apikey:process.env.SUPABASE_PUBLISHABLE_KEY}:{})},body:JSON.stringify({operation:'get',kind:'incident',id:`incident:${incident.id}`})});save('direct Supabase gateway incident',{status:r.status,body:await r.json()});}
 save('contractor review',await req(`/api/incidents/${incident.id}/review`,tokens.contractor,{}));
 for(const role of Object.keys(tokens)){tokens[role]=await login(role);save(`fresh login persisted ${role}`,await req(`/api/incidents/${incident.id}`,tokens[role]));}
}
const worker=(await req('/api/me',tokens.worker)).body.data;
const original={title:'AUDIT TEST: Install safety railing near the second-floor staircase.',instructions:'Install 4 steel posts near the second-floor staircase.',safetyNotes:'Wear site safety equipment.'};
const preview=await req('/api/tasks/preview',tokens.contractor,{assignedTo:worker.id,sourceLanguage:'en',original});save('task preview',preview);
if(preview.body.data?.previewToken){const created=await req('/api/tasks',tokens.contractor,{assignedTo:worker.id,sourceLanguage:'en',original,location:'Second-floor staircase',deadline:new Date(Date.now()+86400000).toISOString(),previewToken:preview.body.data.previewToken});save('task create',created);const id=created.body.data?.id;if(id){for(const action of ['acknowledge','start','complete']){save(`task ${action}`,await req(`/api/tasks/${id}/${action}`,tokens.worker,{}));save(`contractor observes ${action}`,await req(`/api/tasks/${id}`,tokens.contractor));}tokens.worker=await login('worker');save('task fresh login',await req(`/api/tasks/${id}`,tokens.worker));}}
const taskResult=evidence.observations.find(x=>x.name==='task create')?.body.data;
if(taskResult && process.env.SUPABASE_GATEWAY_URL){const r=await fetch(process.env.SUPABASE_GATEWAY_URL,{method:'POST',headers:{Authorization:`Bearer ${tokens.worker}`,'Content-Type':'application/json',...(process.env.SUPABASE_PUBLISHABLE_KEY?{apikey:process.env.SUPABASE_PUBLISHABLE_KEY}:{})},body:JSON.stringify({operation:'get',kind:'task',id:`task:${taskResult.id}`})});save('direct Supabase gateway task',{status:r.status,body:await r.json()});}
const before=(await req('/api/incidents',tokens.worker)).body.data?.map(x=>x.id).sort();
for(const language of ['en','hi','bn']) {const update=await req('/api/me/language',tokens.worker,{language},'PATCH');const after=(await req('/api/incidents',tokens.worker)).body.data?.map(x=>x.id).sort();save(`language identity ${language}`,{status:update.status,unchanged:JSON.stringify(before)===JSON.stringify(after)});}
await req('/api/me/language',tokens.worker,{language:worker.preferredLanguage},'PATCH');
const html=await (await fetch(base)).text();const assets=[...html.matchAll(/(?:src|href)="([^\"]+\.js)"/g)].map(x=>x[1]);
let leaks=[];let scanned=[];for(const asset of assets){const content=await (await fetch(new URL(asset,base))).text();scanned.push(asset);if(/gsk_[a-zA-Z0-9]{20,}|sb_secret_[a-zA-Z0-9]+|VITE_GROQ_API_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(content)||(process.env.GROQ_API_KEY && content.includes(process.env.GROQ_API_KEY)))leaks.push(asset);}
save('production JS secret scan',{scanned,leaks});
save('finished',{at:new Date().toISOString()});
