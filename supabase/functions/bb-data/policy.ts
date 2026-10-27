export type Kind = 'profile' | 'site' | 'task' | 'incident' | 'wage';
export interface Row {id:string;kind:Kind;siteId:string;ownerId:string;payload:Record<string,any>;version:number}
export interface Actor {uid:string;role:'worker'|'contractor'|'hospital_responder';siteId:string}
export class Denied extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
export function check(condition:unknown,status=403,code='FORBIDDEN',message='This action is not available to your account.'):asserts condition { if(!condition) throw new Denied(status,code,message); }
const same = (a:unknown,b:unknown) => JSON.stringify(a)===JSON.stringify(b);
const omit = (value:Record<string,any>,keys:string[]) => Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
const iso = (value:unknown) => typeof value==='string' && Number.isFinite(Date.parse(value));
export function canRead(actor:Actor,row:Row) {
  if(row.siteId!==actor.siteId)return false;
  if(row.kind==='profile')return row.ownerId===actor.uid || (actor.role==='contractor' && row.payload.role==='worker');
  if(row.kind==='site')return true;
  if(row.kind==='task'||row.kind==='wage')return actor.role==='contractor'||(actor.role==='worker'&&row.ownerId===actor.uid);
  return actor.role!=='worker'||row.ownerId===actor.uid;
}
export function validateInsert(actor:Actor,row:Row,worker?:Row|null) {
  const p=row.payload;
  check(row.siteId===actor.siteId && p.siteId===actor.siteId && row.version===1);
  check(row.id===`${row.kind}:${p.id}`,400,'INVALID_RECORD','Invalid record identity.');
  if(row.kind==='task') {
    check(actor.role==='contractor'&&p.createdBy===actor.uid&&p.assignedTo===row.ownerId&&worker?.payload.role==='worker'&&worker.siteId===actor.siteId);
    check(p.status==='assigned'&&!p.acknowledgedAt&&!p.completedAt&&p.original&&p.translations&&iso(p.deadline),400,'INVALID_TASK','Task fields are invalid.');
  } else if(row.kind==='incident') {
    check(actor.role==='worker'&&row.ownerId===actor.uid&&p.reporterId===actor.uid);
    check(p.status==='reported'&&p.isSimulation===true&&Array.isArray(p.events)&&p.events.length===1,400,'INVALID_INCIDENT','Incident fields are invalid.');
    check(p.events[0].actorId===actor.uid&&p.events[0].actorRole===actor.role&&p.events[0].to==='reported'&&p.events[0].from===null);
    check(['injury','hazard','unsafe_condition','near_miss','other'].includes(p.category)&&['low','medium','high','urgent'].includes(p.urgency)&&typeof p.originalText==='string'&&p.originalText.length>=5,400,'INVALID_INCIDENT','Incident fields are invalid.');
  } else if(row.kind==='wage') {
    check(actor.role==='contractor'&&p.workerId===row.ownerId&&worker?.payload.role==='worker'&&worker.siteId===actor.siteId);
    for(const key of ['dailyRate','daysWorked','overtimeHours','overtimeRate','deductions','paidAmount']) check(typeof p[key]==='number'&&Number.isFinite(p[key])&&p[key]>=0,400,'INVALID_WAGE','Wage amounts are invalid.');
    check(p.disputed===false&&['recorded','agreed'].includes(p.source));
  } else throw new Denied(403,'FORBIDDEN','Profiles and sites are managed through authorized database migrations.');
}
export function validateUpdate(actor:Actor,old:Row,next:Row) {
  check(canRead(actor,old)&&old.kind===next.kind&&old.id===next.id&&old.siteId===next.siteId&&old.ownerId===next.ownerId);
  const before=old.payload,after=next.payload;
  if(old.kind==='profile') {
    check(old.ownerId===actor.uid && same(omit(before,['preferredLanguage']),omit(after,['preferredLanguage'])) && ['en','hi','bn'].includes(after.preferredLanguage));
  } else if(old.kind==='task') {
    check(actor.role==='worker'&&old.ownerId===actor.uid);
    check(same(omit(before,['status','acknowledgedAt','completedAt','updatedAt']),omit(after,['status','acknowledgedAt','completedAt','updatedAt'])));
    const transitions:Record<string,string[]>={assigned:['acknowledged'],acknowledged:['in_progress','completed'],in_progress:['completed']};
    check(transitions[before.status]?.includes(after.status),409,'INVALID_TRANSITION','Invalid task transition.');
    check(iso(after.acknowledgedAt)&&(!before.acknowledgedAt||before.acknowledgedAt===after.acknowledgedAt));
    check(after.status==='completed'?iso(after.completedAt):!after.completedAt);
  } else if(old.kind==='incident') {
    check(actor.role==='contractor'||actor.role==='hospital_responder');
    check(same(omit(before,['status','events','englishTranslation','translationStatus','updatedAt']),omit(after,['status','events','englishTranslation','translationStatus','updatedAt'])));
    if(before.status===after.status) {
      check(same(before.events,after.events)&&after.translationStatus==='ready'&&typeof after.englishTranslation==='string');
    } else {
      const transitions:Record<string,string[]>={reported:actor.role==='contractor'?['reviewed']:['acknowledged_demo'],reviewed:['acknowledged_demo'],acknowledged_demo:['follow_up_demo','closed_demo'],follow_up_demo:['closed_demo']};
      check(actor.role==='hospital_responder'||after.status==='reviewed');
      check(transitions[before.status]?.includes(after.status),409,'INVALID_TRANSITION','Invalid demo incident transition.');
      check(same(before.englishTranslation,after.englishTranslation)&&before.translationStatus===after.translationStatus);
      check(Array.isArray(after.events)&&after.events.length===before.events.length+1&&same(before.events,after.events.slice(0,-1)));
      const event=after.events.at(-1);check(event.actorId===actor.uid&&event.actorRole===actor.role&&event.from===before.status&&event.to===after.status&&iso(event.at));
    }
  } else if(old.kind==='wage') {
    check(actor.role==='worker'&&old.ownerId===actor.uid&&after.disputed===true&&same(omit(before,['disputed','updatedAt']),omit(after,['disputed','updatedAt'])));
  } else throw new Denied(403,'FORBIDDEN','Site updates are unavailable.');
}
