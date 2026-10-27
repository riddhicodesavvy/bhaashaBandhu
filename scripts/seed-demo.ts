import 'dotenv/config';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import { adminApp, projectId } from '../server/firebase';
import { SupabaseStore } from '../server/store';
import type { Envelope, Profile, Role, Site, Wage, Task, Incident } from '../shared/types';
import { statutoryBocwOvertimeRate } from '../shared/types';

const accounts: { email: string; role: Role; name: string; language: 'hi' | 'en'; uidVariable: string }[] = [
  { email: 'worker@bhashabandhu.demo', role: 'worker', name: 'Ravi Kumar (Hindi, Mason, from UP working in Bangalore)', language: 'hi', uidVariable: 'DEMO_WORKER_UID' },
  { email: 'contractor@bhashabandhu.demo', role: 'contractor', name: 'Anita Demo (Site Engineer / BOCW Officer)', language: 'en', uidVariable: 'DEMO_CONTRACTOR_UID' },
  { email: 'hospital@bhashabandhu.demo', role: 'hospital_responder', name: 'Responder Demo (ER Triage / SBAR Intake)', language: 'en', uidVariable: 'DEMO_HOSPITAL_UID' }
];

async function main() {
  if (projectId !== 'sdg8-4fca4') throw new Error('Refusing to seed a different Firebase project.');
  if (process.env.DEMO_MODE !== 'true') throw new Error('Set DEMO_MODE=true for synthetic demo seeding.');

  const store = new SupabaseStore();
  const siteId = 'demo-site-01';

  async function createOnly<T>(record: Envelope<T>) {
    try {
      if (!(await store.get(record.id))) await store.insert(record);
    } catch (e) {
      console.warn(`Record ${record.id} already exists or insert skipped:`, (e as Error).message);
    }
  }

  // 1. Construction Site
  const site: Site = {
    id: siteId,
    name: 'Bandhu Metro Line 4 Station Pier · Bangalore',
    location: 'Plot 18, Outer Ring Road, Mahadevapura, Bengaluru, Karnataka',
    contact: 'Site Safety Officer Anita Demo: +91-98765-43210 (Site Office Gate 2)'
  };
  await createOnly({ id: `site:${siteId}`, kind: 'site', siteId, ownerId: '', payload: site, version: 1 });

  // 2. Worker 1: Ravi Kumar (Hindi, Mason, from UP working in Bangalore)
  let workerId = '';
  let contractorId = '';
  for (const account of accounts) {
    const uid = process.env[account.uidVariable] || (await getAuth(adminApp()).getUserByEmail(account.email)).uid;
    const profile: Profile = { id: uid, email: account.email, displayName: account.name, role: account.role, preferredLanguage: account.language, siteId, isDemo: true };
    await createOnly({ id: `profile:${uid}`, kind: 'profile', siteId, ownerId: uid, payload: profile, version: 1 });
    if (account.role === 'worker') workerId = uid;
    if (account.role === 'contractor') contractorId = uid;
    console.info(`Ready: ${account.role} Supabase profile linked to Firebase UID.`);
  }

  // 3. Worker 2 & 3: Migrant Construction Workers under BOCW Act
  // - Subhash Mondal (Bengali, Scaffolder, from West Bengal working in Hyderabad)
  // - Sunita Murmu (Hindi, Safety Assistant / Helper)
  const extraWorkers: Profile[] = [
    {
      id: 'demo-worker-bn-01',
      email: 'subhash.mondal@bhashabandhu.demo',
      displayName: 'Subhash Mondal (সুভাষ মণ্ডল) - Scaffolder (West Bengal / Hyderabad)',
      role: 'worker',
      preferredLanguage: 'bn',
      siteId,
      isDemo: true
    },
    {
      id: 'demo-worker-hi-02',
      email: 'sunita.murmu@bhashabandhu.demo',
      displayName: 'Sunita Murmu (Safety Assistant / Helper)',
      role: 'worker',
      preferredLanguage: 'hi',
      siteId,
      isDemo: true
    }
  ];
  for (const p of extraWorkers) {
    await createOnly({ id: `profile:${p.id}`, kind: 'profile', siteId, ownerId: p.id, payload: p, version: 1 });
  }

  // 4. Exactly 5 Realistic Tasks Covering High-Risk Trades
  const now = new Date();
  const tasks: Task[] = [
    // Task 1: Scaffolding & working at heights (IS 3696 – harness double-lanyard, toe-boards, inspection tags)
    {
      id: 'demo-task-scaffold',
      siteId,
      assignedTo: 'demo-worker-bn-01', // Subhash Mondal (Scaffolder)
      createdBy: contractorId || 'contractor-demo',
      original: {
        title: 'Inspect Tower B 4th floor external scaffolding & anchor ties (IS 3696)',
        instructions: 'Inspect all scaffold coupler clamps, ledger pipes, and toe-boards on Tower B, Level 4 according to IS 3696 standards. Ensure green inspection tag is signed and dated. Use double-lanyard full body harness anchored to the lifeline at all times. Do not step onto unanchored ledger pipes.',
        safetyNotes: '100% tie-off mandatory with shock-absorbing lanyard. Toe-boards and green debris net must be secured. Work halts if wind gusts exceed 30 km/h.'
      },
      sourceLanguage: 'en',
      translations: {
        hi: {
          title: 'टावर B चौथी मंजिल के बाहरी पाड़ और एंकर टाई की जांच करें (IS 3696)',
          instructions: 'IS 3696 मानकों के अनुसार टावर B, लेवल 4 पर सभी पाड़ कपलर क्लैंप, लेजर पाइप और टो-बोर्ड की जांच करें। सुनिश्चित करें कि हरे निरीक्षण टैग पर हस्ताक्षर हैं। हर समय लाइफलाइन से जुड़े डबल-लान्यार्ड फुल बॉडी हार्नेस का उपयोग करें। असुरक्षित पाइपों पर न चढ़ें।',
          safetyNotes: '100% टाई-ऑफ अनिवार्य है। टो-बोर्ड और हरी सुरक्षा जाली बंधी होनी चाहिए। हवा की गति 30 किमी/घंटा से अधिक होने पर काम रोकें।'
        },
        bn: {
          title: 'টাওয়ার B চতুর্থ তলার বাইরের মাচা এবং অ্যাঙ্কর টাই পরিদর্শন করুন (IS 3696)',
          instructions: 'IS 3696 মান অনুযায়ী টাওয়ার B, লেভেল 4-এর সমস্ত স্ক্যাফোল্ড কাপলার ক্ল্যাম্প, লেজার পাইপ এবং টো-বোর্ড পরীক্ষা করুন। সবুজ পরিদর্শন ট্যাগ স্বাক্ষরিত ও তারিখ দেওয়া নিশ্চিত করুন। সর্বদা লাইফলাইনে বাঁধা ডাবল-ল্যানিয়ার্ড ফুল বডি হারনেস ব্যবহার করুন। অনিরাপদ পাইপে উঠবেন না।',
          safetyNotes: '১০০% টাই-অফ বাধ্যতামূলক। টো-বোর্ড এবং সবুজ সুরক্ষা জাল শক্তভাবে লাগানো থাকতে হবে। বাতাসের গতি ৩০ কিমি/ঘণ্টার বেশি হলে কাজ বন্ধ থাকবে।'
        }
      },
      deadline: new Date(now.getTime() + 86400000).toISOString(),
      location: 'Tower B, Level 4 Exterior Facade',
      status: 'in_progress',
      acknowledgedAt: new Date(now.getTime() - 7200000).toISOString(),
      createdAt: new Date(now.getTime() - 14400000).toISOString(),
      updatedAt: new Date(now.getTime() - 3600000).toISOString()
    },
    // Task 2: Deep excavation / trenching (shoring, dewatering before monsoon)
    {
      id: 'demo-task-trench',
      siteId,
      assignedTo: workerId, // Ravi Kumar
      createdBy: contractorId || 'contractor-demo',
      original: {
        title: 'Deep excavation trench shoring & dewatering before monsoon',
        instructions: 'Install timber trench jacks and shoring sheets in Zone 3 storm drain before monsoon rain. Keep spoil heap at least 1.5 meters away from the excavation edge. Run submersible sludge pump to dewater foundation trenches.',
        safetyNotes: 'Never enter an unsupported trench deeper than 1.2 meters. Wear hard hat and rubber safety gumboots with steel toe. Continuous atmospheric check for sewer gas.'
      },
      sourceLanguage: 'en',
      translations: {
        hi: {
          title: 'मानसून से पहले गहरी खाई की शटरिंग और पानी की निकासी',
          instructions: 'मानसून की बारिश से पहले ज़ोन 3 नाले में लकड़ी के ट्रेंच जैक और शटरिंग शीट लगाएं। खोदी गई मिट्टी को खाई के किनारे से कम से कम 1.5 मीटर दूर रखें। नींव की खाई से पानी निकालने के लिए सबमर्सिबल पम्प चलाएं।',
          safetyNotes: '1.2 मीटर से गहरी बिना सहारे की खाई में कभी न उतरें। हेलमेट और स्टील-टो वाले रबर बूट पहनें। सीवर गैस के लिए लगातार जांच करें।'
        },
        bn: {
          title: 'বর্ষার আগে গভীর পরিখার প্রাচীর নির্মাণ ও জল নিষ্কাশন',
          instructions: 'বর্ষার বৃষ্টির আগে জোন ৩ স্টর্ম ড্রেনে কাঠের ট্রাঞ্চ জ্যাক ও শাটারিং শীট বসান। তোলা মাটি পরিখার কিনারা থেকে অন্তত ১.৫ মিটার দূরে রাখুন। সাবমার্সিবল পাম্প দিয়ে জল বের করুন।',
          safetyNotes: '১.২ মিটারের বেশি গভীর অরক্ষিত পরিখায় কখনো নামবেন না। হেলমেট এবং স্টিল-টো রাবার বুট পরা বাধ্যতামূলক।'
        }
      },
      deadline: new Date(now.getTime() + 259200000).toISOString(),
      location: 'Zone 3 Perimeter Storm Drain & Sump Pit',
      status: 'assigned',
      createdAt: new Date(now.getTime() - 1800000).toISOString(),
      updatedAt: new Date(now.getTime() - 1800000).toISOString()
    },
    // Task 3: Rebar / steel fabrication (protruding rebar puncture risk, cage lifting)
    {
      id: 'demo-task-rebar',
      siteId,
      assignedTo: workerId, // Ravi Kumar
      createdBy: contractorId || 'contractor-demo',
      original: {
        title: 'Fabricate and bind rebar cage for basement column C-14',
        instructions: 'Cut and bend 25mm Fe-500 rebar according to bar-bending schedule sheet #4. Bind stirrups at 150mm spacing using 18-gauge binding wire. Maintain 50mm concrete cover blocks. Rig 4-point nylon lifting sling for crane hoisting.',
        safetyNotes: 'Wear anti-puncture heavy-duty leather gloves and protective safety glasses. Keep rebar mushroom safety caps on all protruding vertical rebars.'
      },
      sourceLanguage: 'en',
      translations: {
        hi: {
          title: 'बेसमेंट कॉलम C-14 के लिए रीबार पिंजरा तैयार और बांधें',
          instructions: 'बार-बेंडिंग शेड्यूल शीट #4 के अनुसार 25mm Fe-500 सरिया काटें और मोड़ें। 18-गेज बाइंडिंग वायर से 150mm की दूरी पर रिंग बांधें। 50mm कंक्रीट कवर ब्लॉक लगाएं। क्रेन से उठाने के लिए 4-पॉइंट स्लिंग बांधें।',
          safetyNotes: 'पंचर-रोधी चमड़े के दस्ताने और सुरक्षा चश्मा पहनें। सभी खुले खड़े सरियों पर मशरूम सुरक्षा कैप लगाएं।'
        },
        bn: {
          title: 'বেসমেন্ট কলাম C-14-এর জন্য রডের খাঁচা তৈরি ও বাঁধাই করুন',
          instructions: 'বার-বেন্ডিং শিডিউল শীট #4 অনুযায়ী 25 মিমি Fe-500 রড কাটুন ও বাঁকান। 18-গেজ বাঁধাই তার দিয়ে 150 মিমি ব্যবধানে রিং বাঁধুন। 50 মিমি কভার ব্লক বজায় রাখুন। ক্রেন তোলার জন্য 4-পয়েন্ট স্লিং বাঁধুন।',
          safetyNotes: 'পাংচার-প্রতিরোধী চামড়ার গ্লাভস এবং সুরক্ষা চশমা পরুন। সমস্ত বেরিয়ে থাকা খাড়া রডের মাথায় মাশরুম সেফটি ক্যাপ লাগান।'
        }
      },
      deadline: new Date(now.getTime() + 172800000).toISOString(),
      location: 'Basement Rebar Yard & Column Grid C-14',
      status: 'acknowledged',
      acknowledgedAt: new Date(now.getTime() - 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 7200000).toISOString(),
      updatedAt: new Date(now.getTime() - 3600000).toISOString()
    },
    // Task 4: Electrical temporary wiring (LOTO procedure, GFCI/ELCB in waterlogged areas)
    {
      id: 'demo-task-loto',
      siteId,
      assignedTo: workerId,
      createdBy: contractorId || 'contractor-demo',
      original: {
        title: 'Basement temporary electrical wiring & LOTO procedure (GFCI / ELCB)',
        instructions: 'Isolate Distribution Board DB-02. Apply physical lockout padlock and danger tag before replacing 63A 30mA RCCB earth-leakage breaker. Verify zero voltage using calibrated multi-meter. Ensure heavy-duty GFCI / ELCB protection for all submerged sump pump feeds.',
        safetyNotes: 'Certified electricians only. Keep moisture barrier mat dry. Never bypass earth-leakage circuit breakers in wet basement environments.'
      },
      sourceLanguage: 'en',
      translations: {
        hi: {
          title: 'बेसमेंट अस्थायी विद्युत वायरिंग और LOTO प्रक्रिया (GFCI / ELCB)',
          instructions: 'डिस्ट्रीब्यूशन बोर्ड DB-02 को अलग करें। 63A 30mA RCCB अर्थ-लीकेज ब्रेकर बदलने से पहले पैडलॉक और डेंजर टैग लगाएं। मल्टीमीटर से शून्य वोल्टेज सत्यापित करें। जलभराव वाले सबमर्सिबल पंपों के लिए GFCI/ELCB सुनिश्चित करें।',
          safetyNotes: 'केवल प्रमाणित इलेक्ट्रीशियन। नमी रोधी मैट सूखी रखें। गीले बेसमेंट में अर्थ लीकेज ब्रेकर को कभी बाईपास न करें।'
        },
        bn: {
          title: 'বেসমেন্ট অস্থায়ী বৈদ্যুতিক তারের কাজ ও LOTO পদ্ধতি (GFCI / ELCB)',
          instructions: 'ডিস্ট্রিবিউশন বোর্ড DB-02 বিচ্ছিন্ন করুন। 63A 30mA RCCB আর্থ-লিকেজ ব্রেকার বদলানোর আগে প্যাডলক ও ডেঞ্জার ট্যাগ লাগান। মাল্টিমিটার দিয়ে শূন্য ভোল্টেজ পরীক্ষা করুন। পাম্পের লাইনে GFCI/ELCB সুরক্ষা নিশ্চিত করুন।',
          safetyNotes: 'শুধুমাত্র অনুমোদিত ইলেকট্রিশিয়ান। আর্দ্রতা প্রতিরোধী মাদুর শুকনো রাখুন। আর্থ লিকেজ ব্রেকার কখনও বাইপাস করবেন না।'
        }
      },
      deadline: new Date(now.getTime() - 3600000).toISOString(),
      location: 'Substation Room · Basement DB-02',
      status: 'completed',
      acknowledgedAt: new Date(now.getTime() - 14400000).toISOString(),
      completedAt: new Date(now.getTime() - 7200000).toISOString(),
      createdAt: new Date(now.getTime() - 28800000).toISOString(),
      updatedAt: new Date(now.getTime() - 7200000).toISOString()
    },
    // Task 5: Concrete curing under extreme heat stress (40°C+, mandatory rest + ORS stations)
    {
      id: 'demo-task-curing',
      siteId,
      assignedTo: 'demo-worker-hi-02', // Sunita Murmu (Safety Assistant / Helper)
      createdBy: contractorId || 'contractor-demo',
      original: {
        title: 'Concrete curing under extreme heat stress (40°C+ mandatory rest & ORS)',
        instructions: 'Spray water curing on newly cast podium concrete deck in 30-minute rotation cycles. Inspect water supply hoses and burlap hessian bags. Ensure all workers take mandatory 15-minute shaded rest breaks every hour and drink cold electrolyte ORS water provided at hydration post #3.',
        safetyNotes: 'Heat index warning active above 40°C. Work immediately ceases if any worker shows dizziness, confusion, or lack of sweat. Monitor wet-bulb globe temperature (WBGT).'
      },
      sourceLanguage: 'en',
      translations: {
        hi: {
          title: 'अत्यधिक गर्मी (40°C+) में कंक्रीट तराई और अनिवार्य विश्राम व ORS स्टेशन',
          instructions: 'पोडियम डेक पर 30 मिनट के चक्र में कंक्रीट की पानी से तराई करें। पानी की नली और गीली बोरियों की जांच करें। हर घंटे छायादार जगह में 15 मिनट का अनिवार्य आराम और हाइड्रेशन पोस्ट #3 पर ORS पानी पीना सुनिश्चित करें।',
          safetyNotes: '40°C से ऊपर लू की चेतावनी सक्रिय है। चक्कर या अत्यधिक थकान दिखने पर तुरंत काम रोकें और प्राथमिक उपचार केंद्र ले जाएं।'
        },
        bn: {
          title: 'তীব্র তাপপ্রবাহে (৪০°C+) কংক্রিট কিউরিং এবং বাধ্যতামূলক বিশ্রাম ও ওআরএস স্টেশন',
          instructions: 'পোডিয়াম ডেকে ৩০ মিনিটের চক্রে কিউরিং জল ছিটান। জলের পাইপ এবং ভেজা চটের বস্তা পরীক্ষা করুন। প্রতি ঘণ্টায় ১৫ মিনিট ছায়ায় বিশ্রাম এবং হাইড্রেশন পোস্ট #৩ থেকে ওআরএস জল পান বাধ্যতামূলক।',
          safetyNotes: '৪০°C তাপমাত্রার উপরে হিট স্ট্রোক সতর্কতা জারি। মাথা ঘোরা বা অতিরিক্ত ঘাম দেখা দিলে কাজ তৎক্ষণাৎ বন্ধ করতে হবে।'
        }
      },
      deadline: new Date(now.getTime() + 108000000).toISOString(),
      location: 'Podium Level 1 Deck & Hydration Station 3',
      status: 'assigned',
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
      updatedAt: new Date(now.getTime() - 3600000).toISOString()
    }
  ];

  for (const task of tasks) {
    await createOnly({ id: `task:${task.id}`, kind: 'task', siteId, ownerId: task.assignedTo, payload: task, version: 1 });
  }

  // 5. Exactly 5 Diverse Incident Reports with Clinical SBAR Handovers
  // (Near Miss, Hazard, Unsafe Condition, Heat Stress, Rebar Puncture)
  const incidents: Incident[] = [
    // Incident 1: Rebar Puncture (Injury)
    {
      id: 'demo-inc-rebar',
      siteId,
      reporterId: workerId,
      originalText: 'पिलर के पास शटरिंग हटाते समय पैर फिसल गया और नीचे खुले खड़े 16mm के सरिया पर दायां पैर पड़ गया। सेफ्टी बूट के किनारे से सरिया पैर में घुस गया। खून बह रहा है। साइट पर प्राथमिक उपचार (प्रेशर बैंडेज) कर दिया है, तुरंत अस्पताल और टेटनस इंजेक्शन की ज़रूरत है।',
      sourceLanguage: 'hi',
      englishTranslation: 'While stripping formwork near the pillar, my foot slipped and my right foot stepped onto an exposed upright 16mm rebar. The rebar penetrated the foot through the edge of the safety boot. Active bleeding. Sterile pressure bandage applied on site; immediate emergency medical evaluation and tetanus toxoid injection required.',
      translationStatus: 'ready',
      category: 'injury',
      urgency: 'urgent',
      location: 'Tower B, 3rd Floor Slab Decking (Grid 4-C)',
      status: 'acknowledged_demo',
      isSimulation: true,
      createdAt: new Date(now.getTime() - 10800000).toISOString(),
      updatedAt: new Date(now.getTime() - 3600000).toISOString(),
      events: [
        { id: randomUUID(), actorId: workerId, actorRole: 'worker', from: null, to: 'reported', at: new Date(now.getTime() - 10800000).toISOString() },
        { id: randomUUID(), actorId: contractorId, actorRole: 'contractor', from: 'reported', to: 'reviewed', at: new Date(now.getTime() - 7200000).toISOString() },
        { id: randomUUID(), actorId: 'hospital-demo', actorRole: 'hospital_responder', from: 'reviewed', to: 'acknowledged_demo', at: new Date(now.getTime() - 3600000).toISOString() }
      ],
      sbarHandover: {
        situation: 'INJURY: Worker suffered penetrating puncture wound to right foot from upright 16mm rebar.',
        background: 'Occurred on Tower B, Level 3 during formwork removal at 11:45 AM. Worker was wearing leather safety boots and hard hat.',
        assessment: 'Puncture wound with active bleeding controlled by sterile pressure dressing. Worker conscious and alert (GCS 15). Blood pressure 128/82, HR 88.',
        recommendation: 'Immediate ER intake for wound irrigation, debridement, and Tdap booster. Call 112 if ambulance required. BOCW site insurance active.',
        workerIdentity: 'Ravi Kumar (Mason, age 29)',
        workerAge: 29,
        workerTrade: 'Mason / Formwork',
        injuryType: 'Penetrating plantar puncture wound (right foot, 16mm rebar)',
        timeOfIncident: new Date(now.getTime() - 10800000).toISOString(),
        siteZone: 'Tower B, 3rd Floor Slab Decking (Grid 4-C)',
        ppeStatus: 'Safety boots worn; rebar pierced sole edge. Hard hat and high-vis vest worn.',
        consciousnessState: 'Conscious, alert, GCS 15. Severe localized pain.',
        bleedingStatus: 'Moderate active capillary hemorrhage arrested with sterile pressure wrap.',
        firstAidGiven: 'Direct pressure dressing applied, foot elevated, ice pack on periwound.',
        bocwInsuranceId: 'BOCW-KA-BLR-883921-2026',
        emergencySiteContact: 'Contractor Anita Demo (+91-98765-43210)'
      }
    },
    // Incident 2: Near Miss (Scaffolding loose coupler detached)
    {
      id: 'demo-inc-scaffold',
      siteId,
      reporterId: 'demo-worker-bn-01', // Subhash Mondal
      originalText: 'চতুর্থ তলার মাচার একটি পাইপের কাপলার ঢিলে হয়ে পাইপটি নিচে সুরক্ষা জালে খসে পড়ে। নিচে কোনো শ্রমিক ছিল না, তাই কেউ আহত হয়নি। কিন্তু পুরো চারতলার মাচার ক্ল্যাম্পগুলো অবিলম্বে পুনরায় টাইট করা দরকার।',
      sourceLanguage: 'bn',
      englishTranslation: 'A pipe coupler on the 4th-floor scaffolding came loose and the pipe fell into the safety netting below. No workers were beneath it, so no injuries occurred. All scaffolding clamps on the 4th floor must be inspected and re-torqued immediately.',
      translationStatus: 'ready',
      category: 'near_miss',
      urgency: 'high',
      location: 'Tower A West Facade, 4th Floor Scaffolding',
      status: 'reviewed',
      isSimulation: true,
      createdAt: new Date(now.getTime() - 21600000).toISOString(),
      updatedAt: new Date(now.getTime() - 14400000).toISOString(),
      events: [
        { id: randomUUID(), actorId: 'demo-worker-bn-01', actorRole: 'worker', from: null, to: 'reported', at: new Date(now.getTime() - 21600000).toISOString() },
        { id: randomUUID(), actorId: contractorId, actorRole: 'contractor', from: 'reported', to: 'reviewed', at: new Date(now.getTime() - 14400000).toISOString() }
      ],
      sbarHandover: {
        situation: 'NEAR MISS: 2-inch steel scaffold ledger pipe detached due to loose coupler and fell into safety net.',
        background: 'Tower A West Facade, Level 4. High gusty wind conditions (34 km/h) experienced during shift.',
        assessment: 'Safety net arrested the fall successfully. Clamps on elevation show signs of torque degradation.',
        recommendation: 'Tag out scaffolding (Red Tag). Competent person scaffold re-inspection required before work resumption.',
        workerIdentity: 'Subhash Mondal (Scaffolder, age 34)',
        workerAge: 34,
        workerTrade: 'Scaffolder / Rigger',
        injuryType: 'Near Miss - No injury reported',
        timeOfIncident: new Date(now.getTime() - 21600000).toISOString(),
        siteZone: 'Tower A West Facade, 4th Floor',
        ppeStatus: 'Full body harness, double lanyard anchored, hard hat with chin strap.',
        consciousnessState: 'Alert, uninjured.',
        bleedingStatus: 'None.',
        firstAidGiven: 'None required. Site work temporarily paused.',
        bocwInsuranceId: 'BOCW-TS-HYD-551209-2026',
        emergencySiteContact: 'Contractor Anita Demo (+91-98765-43210)'
      }
    },
    // Incident 3: Unsafe Condition (Submerged 440V cable in standing water)
    {
      id: 'demo-inc-electrical',
      siteId,
      reporterId: workerId,
      originalText: 'बेसमेंट -2 में बारिश का पानी 1 फीट तक भरा हुआ है और वहां 440V का मुख्य केबल पानी में डूबा हुआ है। केबल के जोड़ पर केवल काली टेप लिपटी है। वहां से चिंगारी निकलती देखी गई है। करंट लगने का गंभीर खतरा है। काम तुरंत रोक दिया गया है।',
      sourceLanguage: 'hi',
      englishTranslation: 'Basement -2 has 1 foot of standing rainwater and a 440V main feeder cable is submerged in the water. The cable joint is wrapped only with black tape. Sparks were observed. Severe electrocution hazard exists. Work has been halted immediately.',
      translationStatus: 'ready',
      category: 'unsafe_condition',
      urgency: 'urgent',
      location: 'Basement -2 Batching Plant & Sump Pump Zone',
      status: 'reported',
      isSimulation: true,
      createdAt: new Date(now.getTime() - 7200000).toISOString(),
      updatedAt: new Date(now.getTime() - 7200000).toISOString(),
      events: [
        { id: randomUUID(), actorId: workerId, actorRole: 'worker', from: null, to: 'reported', at: new Date(now.getTime() - 7200000).toISOString() }
      ],
      sbarHandover: {
        situation: 'UNSAFE CONDITION: Submerged 440V temporary power cable with sparking joint in waterlogged basement.',
        background: 'Basement -2 sump area after heavy overnight rainfall. Drainage pump was non-functional.',
        assessment: 'Direct risk of mass electrocution for workers in the basement area. Flammable vapors excluded.',
        recommendation: 'Emergency de-energization at main substation. Lockout/Tagout applied until cable is elevated onto overhead cable trays.',
        workerIdentity: 'Ravi Kumar (Mason, age 29)',
        workerAge: 29,
        workerTrade: 'Mason',
        injuryType: 'Unsafe Condition - Potential fatal electrical shock',
        timeOfIncident: new Date(now.getTime() - 7200000).toISOString(),
        siteZone: 'Basement -2 Batching Plant & Sump Pump Zone',
        ppeStatus: 'Rubber gumboots, hard hat.',
        consciousnessState: 'Normal, uninjured reporter.',
        bleedingStatus: 'None.',
        firstAidGiven: 'Zone evacuated and red barricade tape installed.',
        bocwInsuranceId: 'BOCW-KA-BLR-883921-2026',
        emergencySiteContact: 'Electrical Supervisor +91-98765-43210'
      }
    },
    // Incident 4: Heat Stress (Severe Heat Exhaustion / Collapse at 42°C)
    {
      id: 'demo-inc-heat',
      siteId,
      reporterId: 'demo-worker-hi-02', // Sunita Murmu
      originalText: 'दोपहर 2 बजे 42°C गर्मी में कंक्रीट वाइब्रेटर चलाते समय श्रमिक को अचानक चक्कर आया, तेज़ सिरदर्द हुआ और वह ज़मीन पर गिर पड़ा। अत्यधिक पसीना और डिहाइड्रेशन के लक्षण हैं। तुरंत छायादार प्राथमिक चिकित्सा कक्ष में ले जाकर ORS दिया गया है।',
      sourceLanguage: 'hi',
      englishTranslation: 'At 2 PM in 42°C extreme heat while operating a concrete vibrator, the worker suddenly became dizzy with severe headache and collapsed. Showing signs of profuse sweating and heat exhaustion. Immediately moved to the shaded first-aid station and administered ORS solution.',
      translationStatus: 'ready',
      category: 'hazard',
      urgency: 'high',
      location: 'Podium Level 1, Open Sun Deck',
      status: 'closed_demo',
      isSimulation: true,
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 43200000).toISOString(),
      events: [
        { id: randomUUID(), actorId: 'demo-worker-hi-02', actorRole: 'worker', from: null, to: 'reported', at: new Date(now.getTime() - 86400000).toISOString() },
        { id: randomUUID(), actorId: contractorId, actorRole: 'contractor', from: 'reported', to: 'reviewed', at: new Date(now.getTime() - 72000000).toISOString() },
        { id: randomUUID(), actorId: 'hospital-demo', actorRole: 'hospital_responder', from: 'reviewed', to: 'acknowledged_demo', at: new Date(now.getTime() - 57600000).toISOString() },
        { id: randomUUID(), actorId: 'hospital-demo', actorRole: 'hospital_responder', from: 'acknowledged_demo', to: 'closed_demo', at: new Date(now.getTime() - 43200000).toISOString() }
      ],
      sbarHandover: {
        situation: 'HEAT STRESS / HAZARD: Acute heat exhaustion with syncopal collapse during open podium concrete pour at 42°C.',
        background: 'Peak afternoon heat index on unshaded podium deck. High ambient humidity.',
        assessment: 'Vitals stabilized after 30 minutes of rest in shaded rest area with electrolyte replenishment. Core temp 38.2°C, BP 110/70, conscious.',
        recommendation: 'Enforce mandatory 12 PM - 3 PM rest shift during extreme heat advisory. Increase hydration stations with oral rehydration salts.',
        workerIdentity: 'Sunita Murmu reporting for helper Suresh (age 24)',
        workerAge: 24,
        workerTrade: 'Helper / Concrete Pouring',
        injuryType: 'Heat Exhaustion (ICD-10 T67.5) with transient syncope',
        timeOfIncident: new Date(now.getTime() - 86400000).toISOString(),
        siteZone: 'Podium Level 1, Open Sun Deck',
        ppeStatus: 'Hard hat, boots, safety goggles, high-vis vest.',
        consciousnessState: 'Conscious, responsive following shaded rest and cold fanning.',
        bleedingStatus: 'No trauma or bleeding.',
        firstAidGiven: 'Moved to air-cooled site cabin, clothing loosened, cold water sponging, 500ml oral ORS administered.',
        bocwInsuranceId: 'BOCW-KA-BLR-774102-2026',
        emergencySiteContact: 'Site Nurse / Anita Demo (+91-98765-43210)'
      }
    },
    // Incident 5: Hazard (Deep excavation soil slip / shoring crack)
    {
      id: 'demo-inc-trench-slip',
      siteId,
      reporterId: workerId,
      originalText: 'तूफानी नाले की 2.5 मीटर गहरी खाई में अचानक मिट्टी धंसने लगी है और लकड़ी के ट्रेंच जैक में दरार आ गई है। यदि तुरंत मिट्टी हटाकर नया लोहे का सपोर्ट नहीं लगाया गया तो पूरी दीवार गिर सकती है।',
      sourceLanguage: 'hi',
      englishTranslation: 'Soil is actively sloughing into the 2.5-meter deep storm drain trench and the timber trench jack has developed a visible fracture. Unless soil weight is immediately cleared and steel trench boxes installed, the wall may suffer a catastrophic cave-in.',
      translationStatus: 'ready',
      category: 'hazard',
      urgency: 'high',
      location: 'Zone 3 Storm Drain Excavation Line (North End)',
      status: 'reported',
      isSimulation: true,
      createdAt: new Date(now.getTime() - 1800000).toISOString(),
      updatedAt: new Date(now.getTime() - 1800000).toISOString(),
      events: [
        { id: randomUUID(), actorId: workerId, actorRole: 'worker', from: null, to: 'reported', at: new Date(now.getTime() - 1800000).toISOString() }
      ],
      sbarHandover: {
        situation: 'HAZARD: Active soil sloughing and fractured timber trench shoring jack in 2.5m excavation.',
        background: 'Zone 3 storm drain line following overnight rainfall that softened the soil embankment.',
        assessment: 'Imminent wall collapse danger if workers enter without engineered trench box protection.',
        recommendation: 'Immediate evacuation of trench. Prohibit entry until hydraulic aluminum trench shields are placed.',
        workerIdentity: 'Ravi Kumar (Mason, age 29)',
        workerAge: 29,
        workerTrade: 'Mason',
        injuryType: 'Hazard - Cave-in danger',
        timeOfIncident: new Date(now.getTime() - 1800000).toISOString(),
        siteZone: 'Zone 3 Storm Drain Excavation Line (North End)',
        ppeStatus: 'Hard hat, safety boots, high-vis vest.',
        consciousnessState: 'Conscious and alert.',
        bleedingStatus: 'None.',
        firstAidGiven: 'Exclusion zone established with safety warning signs.',
        bocwInsuranceId: 'BOCW-KA-BLR-883921-2026',
        emergencySiteContact: 'Geotechnical Site Engineer (+91-98765-43210)'
      }
    }
  ];

  for (const inc of incidents) {
    await createOnly({ id: `incident:${inc.id}`, kind: 'incident', siteId, ownerId: inc.reporterId, payload: inc, version: 1 });
  }

  // 6. Multi-Week BOCW Act Wage Records for All 3 Workers
  // Demonstrating:
  // - Statutory 2x overtime rate under BOCW Section 28: (dailyRate / 8) * 2
  // - Khuraki / mess advance deductions
  // - Dispute flags with explanatory worker notes
  const wages: Wage[] = [
    // Ravi Kumar (Daily Rate ₹850 -> OT Rate ₹212.50)
    {
      id: 'demo-wage-ravi-01',
      siteId,
      workerId,
      workDate: '2026-10-27',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 8,
      overtimeRate: statutoryBocwOvertimeRate(850), // 212.50 (BOCW Sec 28: 2x rate)
      deductions: 500,
      deductionReason: 'Weekly mess food advance (Khuraki)',
      paidAmount: 6300,
      source: 'agreed',
      disputed: false,
      updatedAt: new Date(now.getTime() - 86400000).toISOString()
    },
    {
      id: 'demo-wage-ravi-02',
      siteId,
      workerId,
      workDate: '2026-10-20',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 4,
      overtimeRate: statutoryBocwOvertimeRate(850),
      deductions: 600,
      deductionReason: '₹200 mess advance + ₹400 penalty for alleged chipped tiles',
      paidAmount: 5350,
      source: 'recorded',
      disputed: true,
      disputeReason: 'Tiles were already chipped when unloaded from delivery truck. Illegal penalty deduction under Payment of Wages Act without joint inspection.',
      updatedAt: new Date(now.getTime() - 604800000).toISOString()
    },
    {
      id: 'demo-wage-ravi-03',
      siteId,
      workerId,
      workDate: '2026-10-13',
      dailyRate: 850,
      daysWorked: 6,
      overtimeHours: 0,
      overtimeRate: statutoryBocwOvertimeRate(850),
      deductions: 0,
      deductionReason: '',
      paidAmount: 5100,
      source: 'recorded',
      disputed: true,
      disputeReason: 'Worked 3.5 hours overtime on Thursday night (Tower B concrete pour) till 11 PM with attendance register entry, but 0 OT hours recorded by subcontractor.',
      updatedAt: new Date(now.getTime() - 1209600000).toISOString()
    },

    // Subhash Mondal (Bengali Scaffolder, Daily Rate ₹900 -> OT Rate ₹225.00)
    {
      id: 'demo-wage-subhash-01',
      siteId,
      workerId: 'demo-worker-bn-01',
      workDate: '2026-10-27',
      dailyRate: 900,
      daysWorked: 6,
      overtimeHours: 10,
      overtimeRate: statutoryBocwOvertimeRate(900), // 225.00
      deductions: 600,
      deductionReason: 'Weekly mess advance (Khuraki)',
      paidAmount: 7050,
      source: 'agreed',
      disputed: false,
      updatedAt: new Date(now.getTime() - 86400000).toISOString()
    },
    {
      id: 'demo-wage-subhash-02',
      siteId,
      workerId: 'demo-worker-bn-01',
      workDate: '2026-10-20',
      dailyRate: 900,
      daysWorked: 6,
      overtimeHours: 2,
      overtimeRate: statutoryBocwOvertimeRate(900),
      deductions: 400,
      deductionReason: 'Mess food advance',
      paidAmount: 5450,
      source: 'recorded',
      disputed: true,
      disputeReason: 'Sunday high-elevation scaffold dismantling was 6 hours emergency overtime due to monsoon storm, only 2 hours credited on payslip.',
      updatedAt: new Date(now.getTime() - 604800000).toISOString()
    },

    // Sunita Murmu (Safety Assistant / Helper, Daily Rate ₹750 -> OT Rate ₹187.50)
    {
      id: 'demo-wage-sunita-01',
      siteId,
      workerId: 'demo-worker-hi-02',
      workDate: '2026-10-27',
      dailyRate: 750,
      daysWorked: 6,
      overtimeHours: 6,
      overtimeRate: statutoryBocwOvertimeRate(750), // 187.50
      deductions: 350,
      deductionReason: 'Mess food meal advance',
      paidAmount: 5275,
      source: 'agreed',
      disputed: false,
      updatedAt: new Date(now.getTime() - 86400000).toISOString()
    }
  ];

  for (const wage of wages) {
    await createOnly({ id: `wage:${wage.id}`, kind: 'wage', siteId, ownerId: wage.workerId, payload: wage, version: 1 });
  }

  console.info('Synthetic Supabase site, 3 migrant workers, 5 high-risk tasks, 5 SBAR incidents, and multi-week BOCW wage entries persisted successfully.');
}

main().catch(error => {
  console.error('Seed blocked:', (error as {code?: string}).code || (error as Error).message);
  process.exitCode = 1;
});
