export const roles = ['worker', 'contractor', 'hospital_responder'] as const;
export type Role = typeof roles[number];
export const locales = ['en', 'hi', 'bn'] as const;
export type Locale = typeof locales[number];
export const home: Record<Role, string> = { worker: '/worker', contractor: '/contractor', hospital_responder: '/hospital' };
export type TaskStatus = 'assigned' | 'acknowledged' | 'in_progress' | 'completed';
export type IncidentStatus = 'reported' | 'reviewed' | 'acknowledged_demo' | 'follow_up_demo' | 'closed_demo';
export type Category = 'injury' | 'hazard' | 'unsafe_condition' | 'near_miss' | 'other';
export type Urgency = 'low' | 'medium' | 'high' | 'urgent';
export interface Profile { id: string; email?: string; displayName: string; role: Role; preferredLanguage: Locale; siteId: string; isDemo: true; }
export interface Site { id: string; name: string; location: string; contact: string; }
export interface Translation { title: string; instructions: string; safetyNotes: string; }
export interface Task { id: string; siteId: string; assignedTo: string; createdBy: string; original: Translation; sourceLanguage: Locale; translations: Partial<Record<Locale, Translation>>; deadline: string; location: string; status: TaskStatus; acknowledgedAt?: string; completedAt?: string; createdAt: string; updatedAt: string; }
export interface IncidentEvent { id: string; actorId: string; actorRole: Role; from: IncidentStatus | null; to: IncidentStatus; at: string; }
export interface Incident { id: string; siteId: string; reporterId: string; originalText: string; sourceLanguage: Locale; englishTranslation: string | null; translationStatus: 'ready' | 'unavailable'; category: Category; urgency: Urgency; location: string; status: IncidentStatus; isSimulation: true; createdAt: string; updatedAt: string; events: IncidentEvent[]; }
export interface Wage { id: string; siteId: string; workerId: string; workDate: string; dailyRate: number; daysWorked: number; overtimeHours: number; overtimeRate: number; deductions: number; deductionReason: string; paidAmount: number; source: 'recorded' | 'agreed'; disputed: boolean; updatedAt: string; }
export interface Session { uid: string; role: Role; siteId: string; }
export type Entity = Profile | Site | Task | Incident | Wage;
export type Kind = 'profile' | 'site' | 'task' | 'incident' | 'wage';
export interface Envelope<T> { id: string; kind: Kind; siteId: string; ownerId: string; payload: T; version: number; }
export interface Store {
  list<T>(kind: Kind, scope?: { siteId?: string; ownerId?: string }): Promise<Envelope<T>[]>;
  get<T>(id: string): Promise<Envelope<T> | null>;
  insert<T>(record: Envelope<T>): Promise<void>;
  compareAndSet<T>(record: Envelope<T>, expectedVersion: number): Promise<boolean>;
}
export const expectedWage = (w: Pick<Wage, 'dailyRate' | 'daysWorked' | 'overtimeHours' | 'overtimeRate' | 'deductions'>) => Math.round((w.dailyRate * w.daysWorked + w.overtimeHours * w.overtimeRate - w.deductions) * 100) / 100;
