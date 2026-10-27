/**
 * BhashaBandhu (SDG 8) Shared Domain Model & Contracts
 * 
 * Production types, state machines, validation guards, and domain rules
 * for multilingual Indic (Hindi + Bengali) construction worker safety,
 * BOCW Act statutory wage calculations, and emergency clinical SBAR handovers.
 */

/** Roles supported across the site lifecycle */
export const roles = ['worker', 'contractor', 'hospital_responder'] as const;
export type Role = typeof roles[number];

/** Indic + English locales supported with bidirectional AI translation */
export const locales = ['en', 'hi', 'bn'] as const;
export type Locale = typeof locales[number];

/** Default dashboard home route for each authenticated role */
export const home: Record<Role, string> = {
  worker: '/worker',
  contractor: '/contractor',
  hospital_responder: '/hospital'
};

/** Task lifecycle state machine: assigned -> acknowledged -> in_progress -> completed */
export type TaskStatus = 'assigned' | 'acknowledged' | 'in_progress' | 'completed';

/** Incident lifecycle state machine: reported -> reviewed -> acknowledged_demo -> follow_up_demo -> closed_demo */
export type IncidentStatus = 'reported' | 'reviewed' | 'acknowledged_demo' | 'follow_up_demo' | 'closed_demo';

/** Standard industrial safety risk categories under Indian Construction Safety Standards */
export type Category = 'injury' | 'hazard' | 'unsafe_condition' | 'near_miss' | 'other';

/** Triage urgency level for safety incident notifications and medical escalation */
export type Urgency = 'low' | 'medium' | 'high' | 'urgent';

/** User profile associated with Firebase UID and localized preferences */
export interface Profile {
  id: string;
  email?: string;
  displayName: string;
  role: Role;
  preferredLanguage: Locale;
  siteId: string;
  isDemo: true;
}

/** Construction site metadata */
export interface Site {
  id: string;
  name: string;
  location: string;
  contact: string;
}

/** Localized task content payload */
export interface Translation {
  title: string;
  instructions: string;
  safetyNotes: string;
}

/**
 * Task record assigned to a worker with verified AI translations
 * preserving numbers, safety guidelines, and audit timestamps.
 */
export interface Task {
  id: string;
  siteId: string;
  assignedTo: string;
  createdBy: string;
  original: Translation;
  sourceLanguage: Locale;
  translations: Partial<Record<Locale, Translation>>;
  deadline: string;
  location: string;
  status: TaskStatus;
  acknowledgedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Immutable incident audit trail event */
export interface IncidentEvent {
  id: string;
  actorId: string;
  actorRole: Role;
  from: IncidentStatus | null;
  to: IncidentStatus;
  at: string;
}

/**
 * Clinical SBAR (Situation, Background, Assessment, Recommendation) handover protocol
 * tailored for migrant construction worker hospital intake and emergency triage under BOCW.
 */
export interface SbarHandover {
  /** S - Situation: Immediate acute problem, severity, and trade context */
  situation: string;
  /** B - Background: Environmental conditions, exact site zone, time, PPE worn */
  background: string;
  /** A - Assessment: Clinical status, vitals, active bleeding, consciousness state */
  assessment: string;
  /** R - Recommendation: Medical action required, emergency transport (112), BOCW insurance */
  recommendation: string;
  /** Worker identity or ID */
  workerIdentity?: string;
  /** Age of injured worker */
  workerAge?: number;
  /** Trade/craft (e.g., Scaffolder, Mason, Rebar worker) */
  workerTrade?: string;
  /** Clinical nature of injury/condition */
  injuryType?: string;
  /** ISO-8601 timestamp of incident */
  timeOfIncident?: string;
  /** Specific construction zone or grid coordinate */
  siteZone?: string;
  /** PPE status at time of incident */
  ppeStatus?: string;
  /** Mental/neurological status (e.g., Conscious GCS 15, Drowsy, Unresponsive) */
  consciousnessState?: string;
  /** Hemorrhage/bleeding condition */
  bleedingStatus?: string;
  /** On-site first-aid administered prior to ambulance arrival */
  firstAidGiven?: string;
  /** BOCW Welfare Board registration / insurance number */
  bocwInsuranceId?: string;
  /** Emergency site contact person & phone */
  emergencySiteContact?: string;
}

/**
 * Incident report submitted by worker in native Indic language or speech,
 * translated with clinical SBAR handover generated for hospital responders.
 */
export interface Incident {
  id: string;
  siteId: string;
  reporterId: string;
  originalText: string;
  sourceLanguage: Locale;
  englishTranslation: string | null;
  translationStatus: 'ready' | 'unavailable';
  category: Category;
  urgency: Urgency;
  location: string;
  status: IncidentStatus;
  isSimulation: true;
  createdAt: string;
  updatedAt: string;
  events: IncidentEvent[];
  sbarHandover?: SbarHandover;
}

/**
 * Multi-week wage record under The Building and Other Construction Workers (BOCW) Act.
 * Preserves daily rate, 2x statutory overtime, food/mess (Khuraki) deductions, and worker dispute status.
 */
export interface Wage {
  id: string;
  siteId: string;
  workerId: string;
  workDate: string;
  dailyRate: number;
  daysWorked: number;
  overtimeHours: number;
  overtimeRate: number;
  deductions: number;
  deductionReason: string;
  paidAmount: number;
  source: 'recorded' | 'agreed';
  disputed: boolean;
  disputeReason?: string;
  updatedAt: string;
}

/** Authenticated session context passed to all service operations */
export interface Session {
  uid: string;
  role: Role;
  siteId: string;
}

export type Entity = Profile | Site | Task | Incident | Wage;
export type Kind = 'profile' | 'site' | 'task' | 'incident' | 'wage';

/** Storage envelope with version counter for optimistic concurrency control */
export interface Envelope<T> {
  id: string;
  kind: Kind;
  siteId: string;
  ownerId: string;
  payload: T;
  version: number;
}

/** Typed API error payload */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/** Standard API envelope for all JSON responses */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/** Data access interface for PostgreSQL / Supabase storage */
export interface Store {
  list<T>(kind: Kind, scope?: { siteId?: string; ownerId?: string }): Promise<Envelope<T>[]>;
  get<T>(id: string): Promise<Envelope<T> | null>;
  insert<T>(record: Envelope<T>): Promise<void>;
  compareAndSet<T>(record: Envelope<T>, expectedVersion: number): Promise<boolean>;
}

/**
 * Computes statutory overtime hourly rate under Section 28 of The Building and Other
 * Construction Workers (Regulation of Employment and Conditions of Service) Act, 1996 (BOCW Act).
 *
 * Under Indian labor law for construction workers:
 * - Standard working shift = 8 hours per day.
 * - Overtime is strictly statutory at 2x the normal hourly rate: (dailyRate / 8) * 2.
 *
 * @param dailyRate Worker's ordinary daily wage for an 8-hour shift in INR
 * @returns Statutory hourly overtime rate rounded to 2 decimal places
 */
export const statutoryBocwOvertimeRate = (dailyRate: number): number =>
  Math.round((dailyRate / 8) * 2 * 100) / 100;

/**
 * Computes expected wage in INR from gross days worked, statutory overtime, and deductions.
 */
export const expectedWage = (
  w: Pick<Wage, 'dailyRate' | 'daysWorked' | 'overtimeHours' | 'overtimeRate' | 'deductions'>
): number =>
  Math.round((w.dailyRate * w.daysWorked + w.overtimeHours * w.overtimeRate - w.deductions) * 100) / 100;

/**
 * Normalizes Indic (Devanagari, Bengali) and Latin Unicode text to Unicode Normalization Form C (NFC)
 * and strips invisible/zero-width formatting characters (ZWJ, ZWNJ, BOM, etc.) that can corrupt
 * string matching, TTS synthesis, or search indexes.
 */
export function normalizeIndicText(text: string): string {
  if (typeof text !== 'string') return '';
  return text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

/** Strict Type Guards */
export function isRole(x: unknown): x is Role {
  return typeof x === 'string' && roles.includes(x as Role);
}

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && locales.includes(x as Locale);
}

export function isProfile(x: unknown): x is Profile {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return typeof p.id === 'string' && isRole(p.role) && isLocale(p.preferredLanguage) && typeof p.displayName === 'string' && p.isDemo === true;
}

export function isTask(x: unknown): x is Task {
  if (!x || typeof x !== 'object') return false;
  const t = x as Record<string, unknown>;
  return typeof t.id === 'string' && typeof t.siteId === 'string' && typeof t.assignedTo === 'string' && typeof t.status === 'string';
}

export function isIncident(x: unknown): x is Incident {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  return typeof i.id === 'string' && typeof i.siteId === 'string' && typeof i.originalText === 'string' && Array.isArray(i.events);
}

export function isWage(x: unknown): x is Wage {
  if (!x || typeof x !== 'object') return false;
  const w = x as Record<string, unknown>;
  return typeof w.id === 'string' && typeof w.workerId === 'string' && typeof w.dailyRate === 'number' && typeof w.paidAmount === 'number';
}

export function isSbarHandover(x: unknown): x is SbarHandover {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return typeof s.situation === 'string' && typeof s.background === 'string' && typeof s.assessment === 'string' && typeof s.recommendation === 'string';
}
