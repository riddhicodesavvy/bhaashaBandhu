import 'dotenv/config';
import assert from 'node:assert/strict';
const authURL=`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY}`;
async function sign(password:string){return fetch(authURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'worker@bhashabandhu.demo',password,returnSecureToken:true})});}
const bad=await sign('Deliberately-invalid-credential-test-2026!');assert.notEqual(bad.status,200);console.info('PASS real Firebase invalid-password rejection');
const good=await sign(process.env.DEMO_WORKER_PASSWORD!);assert.equal(good.status,200);const identity=await good.json();
async function gateway(body:unknown,status:number,token:string|null=identity.idToken){const r=await fetch(process.env.SUPABASE_GATEWAY_URL!,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const b=await r.json();assert.equal(r.status,status,b.error?.message);return b.data;}
await gateway({operation:'list',kind:'task'},401,null);await gateway({operation:'list',kind:'task'},401,'invalid-token');console.info('PASS gateway rejects absent and forged Firebase credentials');
await gateway({operation:'list',kind:'task',scope:{siteId:'outside-demo-site'}},403);console.info('PASS live cross-site data request rejected');
await gateway({operation:'get',kind:'profile',id:`profile:${process.env.DEMO_HOSPITAL_UID}`},404);console.info('PASS worker cannot read another role profile');
const profile=await gateway({operation:'get',kind:'profile',id:`profile:${identity.localId}`},200);
await gateway({operation:'update',kind:'profile',row:{...profile,payload:{...profile.payload,role:'contractor'}},expectedVersion:profile.version},403);console.info('PASS direct gateway role-escalation attempt rejected');
const direct=await fetch(process.env.SUPABASE_URL+'/rest/v1/user_profiles?select=id',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY!}});assert.ok([401,403].includes(direct.status));console.info('PASS publishable-key direct table access denied by database grants/RLS');
