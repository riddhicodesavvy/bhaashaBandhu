import 'dotenv/config';
import fs from 'node:fs';
const base='https://bhaasha-bandhu.vercel.app';const results=[];
const record=(name,value)=>{results.push({name,...value});fs.writeFileSync('test-results/production-task-retest.json',JSON.stringify(results,null,2));console.log(name,JSON.stringify(value));};
async function api(path,token,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} :{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json(),requestId:r.headers.get('x-vercel-id')};}
const cfg=(await api('/api/config')).body.data;
async function login(role){const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.firebase.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${role}@bhashabandhu.demo`,password:process.env[`DEMO_${role.toUpperCase()}_PASSWORD`],returnSecureToken:true})});const d=await r.json();if(!d.idToken)throw Error('Login failed');return d.idToken;}
const w=await login('worker'),c=await login('contractor'),h=await login('hospital');
const worker=(await api('/api/me',w)).body.data;
const original={title:'Install safety railing near the second-floor staircase.',instructions:'AUDIT TEST: Install 4 steel posts near the second-floor staircase.',safetyNotes:'Wear site safety equipment.'};
const input={assignedTo:worker.id,sourceLanguage:'en',original};
let preview;for(let i=1;i<=3;i++){const p=await api('/api/tasks/preview',c,input);record(`preview ${i}`,{status:p.status,error:p.body.error,translations:p.body.data?.translations});if(p.status===200)preview=p.body.data;}
if(preview){const created=await api('/api/tasks',c,{...input,deadline:new Date(Date.now()+86400000).toISOString(),location:'Second-floor staircase',previewToken:preview.previewToken});record('create',created);const id=created.body.data?.id;if(id){for(const action of ['acknowledge','start','complete']){record(`worker ${action}`,await api(`/api/tasks/${id}/${action}`,w,{}));record(`contractor ${action}`,await api(`/api/tasks/${id}`,c));const r=await fetch(process.env.SUPABASE_GATEWAY_URL,{method:'POST',headers:{Authorization:`Bearer ${w}`,'Content-Type':'application/json',apikey:process.env.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({operation:'get',kind:'task',id:`task:${id}`})});record(`database ${action}`,{status:r.status,body:await r.json()});}record('new login persisted',await api(`/api/tasks/${id}`,await login('worker')));}}
record('hospital cannot create task',await api('/api/tasks',h,{}));
const previous=JSON.parse(fs.readFileSync('test-results/production-audit-final.json')).observations.find(x=>x.name==='create incident').body.data;
for(const [role,token] of [['worker',w],['contractor',c],['hospital',h]])record(`incident survives deployment ${role}`,await api(`/api/incidents/${previous.id}`,token));
record('worker cannot review',await api(`/api/incidents/${previous.id}/review`,w,{}));
