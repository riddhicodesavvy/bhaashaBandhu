import 'dotenv/config';
import fs from 'node:fs';
const base='https://bhaasha-bandhu.vercel.app';
const previous=JSON.parse(fs.readFileSync('test-results/production-audit-final.json')).observations.find(x=>x.name==='create incident').body.data;
const cfg=await (await fetch(base+'/api/config')).json();const evidence=[];
for(const role of ['worker','contractor','hospital']) {
 const a=await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.data.firebase.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${role}@bhashabandhu.demo`,password:process.env[`DEMO_${role.toUpperCase()}_PASSWORD`],returnSecureToken:true})})).json();if(!a.idToken)throw Error('Login failed');
 const r=await fetch(`${base}/api/incidents/${previous.id}`,{headers:{Authorization:`Bearer ${a.idToken}`}});const d=await r.json();evidence.push({role,status:r.status,record:d.data});
 if(role==='worker'){const r=await fetch(process.env.SUPABASE_GATEWAY_URL,{method:'POST',headers:{Authorization:`Bearer ${a.idToken}`,'Content-Type':'application/json',apikey:process.env.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({operation:'get',kind:'incident',id:`incident:${previous.id}`})});evidence.push({name:'Supabase hospital update',status:r.status,body:await r.json()});}
}
const html=await (await fetch(base)).text();const assets=[...html.matchAll(/(?:src|href)="([^\"]+\.js)"/g)].map(x=>x[1]);const leaks=[];for(const path of assets){const text=await (await fetch(new URL(path,base))).text();if(/gsk_[a-zA-Z0-9]{20,}|sb_secret_[a-zA-Z0-9]+|VITE_GROQ_API_KEY|SUPABASE_SERVICE_ROLE_KEY/.test(text)||(process.env.GROQ_API_KEY&&text.includes(process.env.GROQ_API_KEY)))leaks.push(path);}
evidence.push({name:'latest production bundle scan',assets,leaks});fs.writeFileSync('test-results/production-final-check.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence.map(x=>({role:x.role,name:x.name,status:x.status,incidentStatus:x.record?.status,version:x.body?.data?.version,leaks:x.leaks})),null,2));
