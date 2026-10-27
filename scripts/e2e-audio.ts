import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'worker@bhashabandhu.demo',password:process.env.DEMO_WORKER_PASSWORD,returnSecureToken:true})});
assert.equal(r.status,200);const identity=await r.json();
const form=new FormData();form.append('language','en');form.append('audio',new Blob([await readFile(process.argv[2]||'test-results/synthetic-report.wav')],{type:'audio/wav'}),'synthetic.wav');
const response=await fetch((process.env.TEST_ORIGIN||'http://localhost:8080')+'/api/audio/transcribe',{method:'POST',headers:{Authorization:`Bearer ${identity.idToken}`},body:form,signal:AbortSignal.timeout(90000)});
const body=await response.json();assert.equal(response.status,200,JSON.stringify(body.error));assert.match(body.data.text,/ladder/i);assert.match(body.data.text,/zone\s*b/i);
console.info('PASS authenticated multipart upload -> real Groq STT -> editable transcript (synthetic English WAV, ladder/Zone B preserved).');
