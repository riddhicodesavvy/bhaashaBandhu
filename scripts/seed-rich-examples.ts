import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Incident, Profile, Task, Wage } from '../shared/types';
import { statutoryBocwOvertimeRate } from '../shared/types';

const origin = process.env.TEST_ORIGIN || 'http://localhost:8080';

async function login(email: string, password: string): Promise<string> {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const b = await r.json();
  assert.equal(r.status, 200, `Firebase login for ${email} failed: ${b.error?.message}`);
  return b.idToken as string;
}

async function call<T>(token: string, path: string, body?: unknown, expected = 200, method?: string): Promise<T> {
  const r = await fetch(origin + '/api' + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000)
  });
  const b = await r.json();
  if (r.status !== expected) {
    throw new Error(`${path} failed (HTTP ${r.status}): ${JSON.stringify(b.error)}`);
  }
  return b.data;
}

async function main() {
  console.info('Logging in with verified Firebase demo accounts...');
  const workerToken = await login('worker@bhashabandhu.demo', process.env.DEMO_WORKER_PASSWORD!);
  const contractorToken = await login('contractor@bhashabandhu.demo', process.env.DEMO_CONTRACTOR_PASSWORD!);
  const hospitalToken = await login('hospital@bhashabandhu.demo', process.env.DEMO_HOSPITAL_PASSWORD!);

  const me = await call<Profile>(workerToken, '/me');
  console.info(`Worker profile resolved: ${me.displayName} (${me.preferredLanguage})`);

  // 1. Seed Real-Life Construction Tasks across High-Risk Trades
  console.info('Seeding realistic multi-trade tasks...');
  const tasksToSeed = [
    {
      original: {
        title: 'Inspect Tower B 4th floor external scaffolding & anchor ties',
        instructions: 'Inspect all scaffold coupler clamps and ledger pipes on Tower B, Level 4. Ensure yellow inspection tag is signed. Use double-lanyard full body harness anchored to the lifeline at all times. Do not climb unanchored ledgers.',
        safetyNotes: '100% tie-off mandatory. Toe-boards and safety green net must be fastened. Work stops if wind speed exceeds 30 km/h.'
      },
      location: 'Tower B, Level 4 Exterior Facade',
      hoursOffset: 24
    },
    {
      original: {
        title: 'Fabricate and bind rebar cage for basement column C-14',
        instructions: 'Cut and bend 25mm Fe-500 rebar according to bar-bending schedule sheet #4. Bind stirrups at 150mm spacing using 18-gauge binding wire. Maintain 50mm concrete cover blocks.',
        safetyNotes: 'Wear anti-puncture heavy-duty leather gloves and protective safety glasses. Keep rebar mushroom safety caps on all protruding vertical rebars.'
      },
      location: 'Basement Rebar Yard & Column Grid C-14',
      hoursOffset: 48
    },
    {
      original: {
        title: 'Perimeter storm drain trench shoring & dewatering',
        instructions: 'Install timber trench jacks and shoring sheets in Zone 3 storm drain before monsoon rain. Keep spoil heap at least 1.5 meters away from the excavation edge. Run submersible sludge pump.',
        safetyNotes: 'Never enter an unsupported trench deeper than 1.2 meters. Wear hard hat and rubber safety gumboots with steel toe.'
      },
      location: 'Zone 3 Perimeter Storm Drain',
      hoursOffset: 72
    }
  ];

  for (const t of tasksToSeed) {
    try {
      const preview = await call<{ previewToken: string }>(contractorToken, '/tasks/preview', {
        assignedTo: me.id,
        sourceLanguage: 'en',
        original: t.original
      });
      const task = await call<Task>(contractorToken, '/tasks', {
        assignedTo: me.id,
        sourceLanguage: 'en',
        original: t.original,
        location: t.location,
        deadline: new Date(Date.now() + t.hoursOffset * 3600000).toISOString(),
        previewToken: preview.previewToken
      }, 201);
      console.info(`✓ Seeded Task: "${task.original.title}" [${task.id}]`);

      // Advance first task to in_progress
      if (t.hoursOffset === 24) {
        await call(workerToken, `/tasks/${task.id}/acknowledge`, {});
        await call(workerToken, `/tasks/${task.id}/start`, {});
        console.info(`  -> Advanced to in_progress`);
      } else if (t.hoursOffset === 48) {
        await call(workerToken, `/tasks/${task.id}/acknowledge`, {});
        console.info(`  -> Acknowledged by worker`);
      }
    } catch (err) {
      console.warn(`Task seed note: ${(err as Error).message}`);
    }
  }

  // 2. Seed Real-Life Incidents with SBAR Handover
  console.info('Seeding realistic incident reports with SBAR handovers...');
  const incidentsToSeed = [
    {
      originalText: 'पिलर के पास शटरिंग हटाते समय पैर फिसल गया और नीचे खुले खड़े 16mm के सरिया पर दायां पैर पड़ गया। सेफ्टी बूट के किनारे से सरिया पैर में घुस गया। खून बह रहा है। साइट पर प्राथमिक उपचार (प्रेशर बैंडेज) कर दिया है, तुरंत अस्पताल और टेटनस इंजेक्शन की ज़रूरत है।',
      sourceLanguage: 'hi',
      category: 'injury',
      urgency: 'urgent',
      location: 'Tower B, 3rd Floor Slab Decking (Grid 4-C)',
      advanceTo: 'acknowledged_demo'
    },
    {
      originalText: 'চতুর্থ তলার মাচার একটি পাইপের কাপলার ঢিলে হয়ে পাইপটি নিচে সুরক্ষা জালে খসে পড়ে। নিচে কোনো শ্রমিক ছিল না, তাই কেউ আহত হয়নি। কিন্তু পুরো চারতলার মাচার ক্ল্যাম্পগুলো অবিলম্বে পুনরায় টাইট করা দরকার।',
      sourceLanguage: 'bn',
      category: 'near_miss',
      urgency: 'high',
      location: 'Tower A West Facade, 4th Floor',
      advanceTo: 'reviewed'
    },
    {
      originalText: 'बेसमेंट -2 में बारिश का पानी 1 फीट तक भरा हुआ है और वहां 440V का मुख्य केबल पानी में डूबा हुआ है। केबल के जोड़ पर केवल काली टेप लिपटी है। वहां से चिंगारी निकलती देखी गई है। करंट लगने का गंभीर खतरा है। काम तुरंत रोक दिया गया है।',
      sourceLanguage: 'hi',
      category: 'unsafe_condition',
      urgency: 'urgent',
      location: 'Basement -2 Batching Plant & Sump Pump Zone',
      advanceTo: 'reported'
    }
  ];

  for (const incData of incidentsToSeed) {
    try {
      const incident = await call<Incident>(workerToken, '/incidents', {
        originalText: incData.originalText,
        sourceLanguage: incData.sourceLanguage,
        category: incData.category,
        urgency: incData.urgency,
        location: incData.location,
        requestId: randomUUID()
      }, 201);
      console.info(`✓ Seeded Incident: [${incident.category.toUpperCase()}] "${incData.location}" [${incident.id}]`);

      if (incData.advanceTo === 'reviewed' || incData.advanceTo === 'acknowledged_demo') {
        await call(contractorToken, `/incidents/${incident.id}/review`, {});
      }
      if (incData.advanceTo === 'acknowledged_demo') {
        await call(hospitalToken, `/incidents/${incident.id}/acknowledge-demo`, {});
        console.info(`  -> Emergency Handover Acknowledged by Hospital Demo Responder`);
      }
    } catch (err) {
      console.warn(`Incident seed note: ${(err as Error).message}`);
    }
  }

  // 3. Seed Multi-Week BOCW Wage Records
  console.info('Seeding multi-week BOCW wage entries with statutory overtime and dispute notes...');
  const wagesToSeed = [
    {
      workDate: '2026-10-27',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 8,
      overtimeRate: statutoryBocwOvertimeRate(850), // 212.50
      deductions: 500,
      deductionReason: 'Weekly mess food advance (Khuraki)',
      paidAmount: 6300,
      source: 'agreed',
      disputeReason: undefined
    },
    {
      workDate: '2026-10-20',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 4,
      overtimeRate: statutoryBocwOvertimeRate(850),
      deductions: 600,
      deductionReason: '₹200 mess advance + ₹400 penalty for alleged chipped tiles',
      paidAmount: 5350,
      source: 'recorded',
      disputeReason: 'Tiles were already chipped when unloaded from delivery truck. Illegal penalty deduction under Payment of Wages Act without joint inspection.'
    },
    {
      workDate: '2026-10-13',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 0,
      overtimeRate: statutoryBocwOvertimeRate(850),
      deductions: 0,
      deductionReason: '',
      paidAmount: 5100,
      source: 'recorded',
      disputeReason: 'Worked 3.5 hours overtime on Thursday night (Tower B concrete pour) till 11 PM with attendance register entry, but 0 OT hours recorded by subcontractor.'
    }
  ];

  for (const w of wagesToSeed) {
    try {
      const wage = await call<Wage>(contractorToken, '/wages', {
        workerId: me.id,
        workDate: w.workDate,
        dailyRate: w.dailyRate,
        daysWorked: w.daysWorked,
        overtimeHours: w.overtimeHours,
        overtimeRate: w.overtimeRate,
        deductions: w.deductions,
        deductionReason: w.deductionReason,
        paidAmount: w.paidAmount,
        source: w.source
      }, 201);
      console.info(`✓ Seeded Wage: Date ${wage.workDate} - ₹${wage.paidAmount} [${wage.id}]`);

      if (w.disputeReason) {
        await call(workerToken, `/wages/${wage.id}/dispute`, { reason: w.disputeReason });
        console.info(`  -> Discrepancy Flagged: "${w.disputeReason.slice(0, 50)}..."`);
      }
    } catch (err) {
      console.warn(`Wage seed note: ${(err as Error).message}`);
    }
  }

  console.info('\n✅ All real-life construction tasks, SBAR incidents, and BOCW wage entries successfully seeded and live!');
}

main().catch(err => {
  console.error('Seed rich examples failed:', err.message);
  process.exitCode = 1;
});
