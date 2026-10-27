import { execFileSync } from 'node:child_process';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const secrets=['GROQ_API_KEY','SUPABASE_SERVICE_ROLE_KEY','FIREBASE_ADMIN_CREDENTIALS_JSON','DEMO_WORKER_PASSWORD','DEMO_CONTRACTOR_PASSWORD','DEMO_HOSPITAL_PASSWORD'].map(key=>process.env[key]).filter(value=>value&&value.length>=8);
let bytes=0;const failures=[];
for(const file of files){const content=execFileSync('git',['show',`:${file}`],{maxBuffer:20*1024*1024});bytes+=content.length;const text=content.toString('utf8');if(secrets.some(value=>text.includes(value))||/gsk_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{15,}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(text))failures.push(file);}
if(files.some(name=>/(^|\/)\.env(?:\.|$)/.test(name)&&!name.endsWith('.example')))failures.push('Private environment file is staged');
console.info(JSON.stringify({files:files.length,bytes,under10MB:bytes<10*1024*1024,secretScan:failures.length?'FAIL':'PASS',failures},null,2));
if(failures.length)process.exitCode=1;
