import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6';
import { canRead, check, Denied, validateInsert, validateUpdate, type Actor, type Kind, type Row } from './policy.ts';
const project='sdg8-4fca4';
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const tables:Record<Kind,string>={profile:'user_profiles',site:'construction_sites',task:'tasks',incident:'incidents',wage:'wage_entries'};
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const cols='id,site_id,owner_id,payload,version';
const decode=(kind:Kind,r:any):Row=>({kind,id:r.id,siteId:r.site_id,ownerId:r.owner_id,payload:r.payload,version:r.version});
const json=(data:unknown,error:unknown=null,status=200)=>new Response(JSON.stringify({data,error}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const rate=new Map<string,{at:number;count:number}>();
async function read(kind:Kind,id:string){const {data,error}=await db.from(tables[kind]).select(cols).eq('id',id).maybeSingle();if(error)throw new Denied(503,'DATABASE_ERROR','Database lookup failed.');return data?decode(kind,data):null;}
Deno.serve(async req=>{
  try {
    check(req.method==='POST',405,'METHOD_NOT_ALLOWED','Use POST.');
    const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];check(token,401,'SIGN_IN_REQUIRED','Firebase authentication is required.');
    let uid:string;
    try {const {payload}=await jwtVerify(token,jwks,{issuer:`https://securetoken.google.com/${project}`,audience:project,algorithms:['RS256']});check(typeof payload.sub==='string'&&payload.sub.length>0,401);uid=payload.sub;}
    catch {throw new Denied(401,'INVALID_TOKEN','Firebase identity could not be verified.');}
    const now=Date.now(),bucket=rate.get(uid);
    if(!bucket||now-bucket.at>60000)rate.set(uid,{at:now,count:1});else{bucket.count++;check(bucket.count<=300,429,'RATE_LIMIT','Please retry shortly.');}
    if(rate.size>1000)for(const [id,b] of rate)if(now-b.at>60000)rate.delete(id);
    const text=await req.text();check(text.length<=256000,413,'INPUT_LIMIT','Request is too large.');
    let body:any;try{body=JSON.parse(text);}catch{throw new Denied(400,'INVALID_JSON','Request must contain JSON.');}
    const kind=body.kind as Kind;check(Object.hasOwn(tables,kind),400,'INVALID_KIND','Unsupported data kind.');
    const operation=body.operation;
    if(operation==='get'&&kind==='profile'&&body.id===`profile:${uid}`)return json(await read('profile',body.id));
    const own=await read('profile',`profile:${uid}`);check(own&&own.ownerId===uid&&own.payload.id===uid&&own.payload.siteId===own.siteId&&['worker','contractor','hospital_responder'].includes(own.payload.role),403,'PROFILE_NOT_CONFIGURED','No authorized application profile exists for this Firebase UID.');
    const actor:Actor={uid,role:own.payload.role,siteId:own.siteId};
    if(operation==='get') {
      check(typeof body.id==='string'&&body.id.startsWith(`${kind}:`),400,'INVALID_ID','Invalid record ID.');
      const row=await read(kind,body.id);if(!row)return json(null);check(canRead(actor,row),404,'NOT_FOUND','Record not found or unavailable.');return json(row);
    }
    if(operation==='list') {
      const scope=body.scope||{};check(!scope.siteId||scope.siteId===actor.siteId);
      if(kind==='task'||kind==='wage')check(actor.role!=='hospital_responder');
      const output:Row[]=[];
      for(let offset=0;offset<10000;offset+=500){
        let query=db.from(tables[kind]).select(cols).eq('site_id',actor.siteId).order('id').range(offset,offset+499);
        if(scope.ownerId)query=query.eq('owner_id',scope.ownerId);
        if(actor.role==='worker'&&kind!=='site')query=query.eq('owner_id',uid);
        if(actor.role==='hospital_responder'&&kind==='profile')query=query.eq('owner_id',uid);
        const {data,error}=await query;if(error)throw new Denied(503,'DATABASE_ERROR','Database list failed.');
        output.push(...(data||[]).map(r=>decode(kind,r)).filter(r=>canRead(actor,r)));
        if(!data||data.length<500)return json(output);
      }throw new Denied(413,'RESULT_LIMIT','Too many records.');
    }
    const row=body.row as Row;
    check(row&&row.kind===kind&&typeof row.id==='string'&&row.id.length<300&&row.payload&&typeof row.payload==='object',400,'INVALID_RECORD','Invalid record data.');
    if(operation==='insert') {
      const worker=kind==='task'||kind==='wage'?await read('profile',`profile:${row.ownerId}`):null;
      validateInsert(actor,row,worker);
      const {error}=await db.from(tables[kind]).insert({id:row.id,site_id:row.siteId,owner_id:row.ownerId,payload:row.payload,version:1});
      if(error)throw new Denied(error.code==='23505'?409:400,'DATABASE_CONSTRAINT','Record could not be inserted.');return json(null);
    }
    check(operation==='update',400,'INVALID_OPERATION','Unsupported operation.');
    const old=await read(kind,row.id);check(old&&canRead(actor,old),404,'NOT_FOUND','Record not found or unavailable.');
    if(old.version!==body.expectedVersion)return json(false);
    validateUpdate(actor,old,row);
    const {data,error}=await db.from(tables[kind]).update({payload:row.payload,version:old.version+1}).eq('id',row.id).eq('version',old.version).select('id');
    if(error)throw new Denied(400,'DATABASE_CONSTRAINT','Record update was rejected.');return json(data?.length===1);
  }catch(error){if(error instanceof Denied)return json(null,{code:error.code,message:error.message},error.status);return json(null,{code:'DATABASE_GATEWAY_ERROR',message:'Database request failed. Please retry.'},503);}
});
