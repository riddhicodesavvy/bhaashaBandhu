import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRead, validateInsert, validateUpdate, type Actor, type Row } from '../supabase/functions/bb-data/policy';
const worker:Actor={uid:'worker',role:'worker',siteId:'site'};
const contractor:Actor={uid:'contractor',role:'contractor',siteId:'site'};
const task:Row={id:'task:t',kind:'task',ownerId:'worker',siteId:'site',version:1,payload:{id:'t',siteId:'site',assignedTo:'worker',createdBy:'contractor',status:'assigned',original:{instructions:'Wear safety shoes.'},translations:{},deadline:'2026-10-27T12:00:00Z'}};
test('deployed gateway policy isolates site/worker and forbids role or task-source tampering',()=>{
  assert.equal(canRead(worker,task),true);assert.equal(canRead({...worker,uid:'other'},task),false);assert.equal(canRead({...contractor,siteId:'elsewhere'},task),false);
  assert.equal(canRead({uid:'hospital',role:'hospital_responder',siteId:'site'},task),false);
  const ack={...task,payload:{...task.payload,status:'acknowledged',acknowledgedAt:new Date().toISOString()}};
  validateUpdate(worker,task,ack);
  assert.throws(()=>validateUpdate(contractor,task,ack));
  assert.throws(()=>validateUpdate(worker,task,{...ack,payload:{...ack.payload,original:{instructions:'Unsafe changed source'}}}));
  const profile:Row={id:'profile:worker',kind:'profile',ownerId:'worker',siteId:'site',version:1,payload:{id:'worker',role:'worker',preferredLanguage:'hi'}};
  validateUpdate(worker,profile,{...profile,payload:{...profile.payload,preferredLanguage:'bn'}});
  assert.throws(()=>validateUpdate(worker,profile,{...profile,payload:{...profile.payload,role:'contractor'}}));
  assert.throws(()=>validateInsert(worker,profile));
});
