import React, { useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  HardHat,
  Hospital,
  ShieldCheck,
  ClipboardCheck,
  Wallet,
  Plus
} from 'lucide-react';
import { useApp } from './context';
import { api, post } from './api';
import { languageNames, type Key } from './i18n';
import {
  home,
  expectedWage,
  statutoryBocwOvertimeRate,
  normalizeIndicText,
  type Task,
  type Incident,
  type Profile,
  type Site,
  type Wage,
  type Translation,
  type Locale,
  type Category,
  type Urgency
} from '../shared/types';
import {
  Brand,
  LanguagePicker,
  ErrorBox,
  Loading,
  PageTitle,
  Empty,
  DemoBanner,
  EmergencyBanner,
  TaskCard,
  IncidentCard,
  Status,
  DateText,
  SpeakButton,
  SpeechRecorder,
  useLoad,
  Refresh
} from './components';

export function Login() {
  const { auth, user, profile, busy, error, configError, t, reload, demo, logout } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [working, setWorking] = useState(false);
  const [loginError, setLoginError] = useState('');

  if (busy) {
    return <Loading />;
  }

  if (profile && user) {
    return <Navigate replace to={home[profile.role]} />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setWorking(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setLoginError(t('invalidLogin'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <LanguagePicker />
      </header>

      <main className="login-layout">
        <section className="login-intro">
          <span className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            {t('tagline')}
          </span>
          <h1>{t('welcome')}</h1>
          <p>{t('loginHelp')}</p>

          <div className="intro-visual" aria-hidden="true">
            <div className="visual-orbit">
              <HardHat size={62} />
            </div>
            <div className="visual-check">
              <CheckCircle2 size={30} />
            </div>
            <div className="visual-languages">
              English <span>हिन्दी</span> বাংলা
            </div>
          </div>

          <div className="intro-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <p>{t('demoData')}</p>
          </div>
        </section>

        <section className="login-card">
          <div className="login-card-heading">
            <span className="small-icon">
              <HardHat size={23} aria-hidden="true" />
            </span>
            <h2>{t('signIn')}</h2>
            <p>{t('loginHelp')}</p>
          </div>

          {busy && <Loading />}
          {configError && <ErrorBox message={configError} retry={reload} />}
          {error && <ErrorBox message={error} retry={reload} />}
          {loginError && <ErrorBox message={loginError} />}

          {user && !profile ? (
            <div className="stack">
              <p>{t('sessionError')}</p>
              <button type="button" className="button" onClick={() => void logout()}>
                {t('logout')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="stack">
              <label>
                {t('email')}
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                />
              </label>

              <label>
                {t('password')}
                <span className="password-field">
                  <input
                    name="password"
                    autoComplete="current-password"
                    type={show ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t(show ? 'hide' : 'show')}
                    onClick={() => setShow(v => !v)}
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                className="button wide"
                disabled={working || busy || !auth}
                aria-label={t('signIn')}
              >
                {working ? t('loading') : t('signIn')}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </form>
          )}

          {(demo || configError) && (
            <div className="demo-accounts">
              <h3>{t('demoAccounts')}</h3>
              {(
                [
                  { role: 'worker', Icon: HardHat },
                  { role: 'contractor', Icon: ClipboardCheck },
                  { role: 'hospital_responder', Icon: Hospital }
                ] as const
              ).map(({ role, Icon }) => {
                const demoEmail = `${role === 'hospital_responder' ? 'hospital' : role}@bhashabandhu.demo`;
                return (
                  <button
                    type="button"
                    className={`demo-account ${email === demoEmail ? 'selected' : ''}`}
                    key={role}
                    onClick={() => {
                      setEmail(demoEmail);
                      setPassword('');
                      setLoginError('');
                    }}
                    aria-label={`${t(role)}: ${demoEmail}`}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <span>
                      <strong>{t(role)}</strong>
                      <small>{demoEmail}</small>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                );
              })}
              <p className="helper">{t('demoHelp')}</p>
            </div>
          )}

          <div className="login-safety">
            <AlertTriangle size={17} aria-hidden="true" />
            <p>{t('demoBanner')}</p>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        BhashaBandhu · SDG 8 · {t('demoData')}
      </footer>
    </div>
  );
}

function LoadBoundary({
  load,
  children
}: {
  load: { loading: boolean; error: string; refresh: () => void };
  children: ReactNode;
}) {
  if (load.loading) return <Loading />;
  if (load.error) return <ErrorBox message={load.error} retry={load.refresh} />;
  return <>{children}</>;
}

export function WorkerHome() {
  const { profile, t } = useApp();
  const load = useLoad<Task[]>('/tasks');
  const tasks = load.data || [];
  const done = tasks.filter(task => task.status === 'completed').length;
  const outstanding = tasks.length - done;

  const nowDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const today = tasks.filter(
    task =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(task.deadline)) === nowDay
  );

  return (
    <>
      <PageTitle
        title={`${t('hello')}, ${profile?.displayName.split(' ')[0]} 👋`}
        subtitle={t('dayMessage')}
      />

      <Link className="report-cta" to="/worker/report" aria-label={t('reportIncident')}>
        <span className="report-icon">
          <AlertTriangle size={24} aria-hidden="true" />
        </span>
        <span>
          <strong>{t('reportIncident')}</strong>
          <small>{t('noDispatch')}</small>
        </span>
        <ArrowRight size={21} aria-hidden="true" />
      </Link>

      <LoadBoundary load={load}>
        <section className="card progress-card">
          <div className="section-header">
            <h2>{t('allTasks')}</h2>
            <span>
              {done}/{tasks.length}
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label={t('completed')}
            aria-valuemin={0}
            aria-valuemax={tasks.length || 1}
            aria-valuenow={done}
          >
            <div style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
          </div>

          <div className="stats-row">
            <div>
              <CheckCircle2 className="teal" aria-hidden="true" />
              <strong>{done}</strong>
              <span>{t('completed')}</span>
            </div>
            <div>
              <Clock3 className="blue" aria-hidden="true" />
              <strong>{outstanding}</strong>
              <span>{t('remaining')}</span>
            </div>
          </div>
        </section>

        <div className="section-header">
          <h2>{t('today')}</h2>
          <Link to="/worker/tasks">{t('viewAll')} →</Link>
        </div>

        {today.length ? (
          <div className="card-grid">
            {today.slice(0, 4).map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <Empty text={t('noTasks')} />
        )}

        <Link className="card wage-link" to="/worker/wages">
          <Wallet className="blue" aria-hidden="true" />
          <strong>{t('wages')}</strong>
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </LoadBoundary>

      <aside className="safety-card">
        <AlertTriangle size={24} aria-hidden="true" />
        <div>
          <h3>{t('safety')}</h3>
          <p>{t('safetyText')}</p>
        </div>
      </aside>

      <Refresh action={load.refresh} updatedAt={load.updatedAt} />
    </>
  );
}

export function TaskList({ contractor = false }: { contractor?: boolean }) {
  const { t } = useApp();
  const load = useLoad<Task[]>('/tasks');
  const workers = useLoad<Profile[]>(contractor ? '/workers' : null);
  const [filter, setFilter] = useState('all');

  const tasks = (load.data || []).filter(task =>
    filter === 'all'
      ? true
      : filter === 'completed'
      ? task.status === 'completed'
      : task.status !== 'completed'
  );

  return (
    <>
      <PageTitle
        title={t('tasks')}
        action={
          contractor ? (
            <Link className="button" to="/contractor/tasks/new" aria-label={t('assign')}>
              <Plus size={19} aria-hidden="true" />
              {t('assign')}
            </Link>
          ) : undefined
        }
      />

      <div className="filters" role="group" aria-label={t('tasks')}>
        {['all', 'todo', 'completed'].map(key => (
          <button
            type="button"
            key={key}
            className={filter === key ? 'selected' : ''}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {t(key as Key)}
          </button>
        ))}
      </div>

      <LoadBoundary load={load}>
        {tasks.length ? (
          <div className="card-grid">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                contractor={contractor}
                workerName={
                  contractor
                    ? workers.data?.find(w => w.id === task.assignedTo)?.displayName
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <Empty text={t('noTasks')} />
        )}
      </LoadBoundary>

      <Refresh action={load.refresh} updatedAt={load.updatedAt} />
    </>
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const { locale, t } = useApp();
  const load = useLoad<Task>(`/tasks/${encodeURIComponent(id!)}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const task = load.data;
  const translated =
    task && (task.sourceLanguage === locale ? task.original : task.translations[locale]);

  async function action(name: string) {
    setBusy(true);
    setError('');
    try {
      const result = await post<Task>(`/tasks/${id}/${name}`);
      load.setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t('taskDetail')} back="/worker/tasks" />

      <LoadBoundary load={load}>
        {task && (
          <div className="stack">
            <section className="card task-detail">
              <Status value={task.status} />

              <h2 lang={translated ? locale : task.sourceLanguage}>
                {(translated || task.original).title}
              </h2>

              <p className="instruction" lang={translated ? locale : task.sourceLanguage}>
                {(translated || task.original).instructions}
              </p>

              {!translated && (
                <p className="notice" role="status">
                  {t('translationUnavailable')}
                </p>
              )}

              <SpeakButton
                locale={translated ? locale : task.sourceLanguage}
                text={`${(translated || task.original).title}. ${(translated || task.original).instructions}. ${(translated || task.original).safetyNotes}`}
              />

              <details className="original-panel">
                <summary>
                  {t('original')} ({languageNames[task.sourceLanguage]})
                </summary>
                <h3 lang={task.sourceLanguage}>{task.original.title}</h3>
                <p lang={task.sourceLanguage}>{task.original.instructions}</p>
              </details>

              <dl className="details-grid">
                <div>
                  <dt>{t('deadline')}</dt>
                  <dd>
                    <DateText value={task.deadline} />
                  </dd>
                </div>
                <div>
                  <dt>{t('location')}</dt>
                  <dd>{task.location}</dd>
                </div>
                <div>
                  <dt>{t('supervisor')}</dt>
                  <dd>{task.createdBy}</dd>
                </div>
                {task.acknowledgedAt && (
                  <div>
                    <dt>{t('acknowledged')}</dt>
                    <dd>
                      <DateText value={task.acknowledgedAt} />
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {task.original.safetyNotes && (
              <aside className="safety-card">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <h3>{t('safetyNotes')}</h3>
                  <p lang={translated ? locale : task.sourceLanguage}>
                    {(translated || task.original).safetyNotes}
                  </p>
                </div>
              </aside>
            )}

            {error && <ErrorBox message={error} />}

            <div className="button-row">
              {task.status === 'assigned' && (
                <button
                  type="button"
                  disabled={busy}
                  className="button wide"
                  onClick={() => void action('acknowledge')}
                >
                  <CheckCircle2 size={20} aria-hidden="true" />
                  {busy ? t('saving') : t('acknowledge')}
                </button>
              )}
              {task.status === 'acknowledged' && (
                <button
                  type="button"
                  disabled={busy}
                  className="button secondary"
                  onClick={() => void action('start')}
                >
                  {t('startTask')}
                </button>
              )}
              {['acknowledged', 'in_progress'].includes(task.status) && (
                <button
                  type="button"
                  disabled={busy}
                  className="button"
                  onClick={() => void action('complete')}
                >
                  <CheckCircle2 size={20} aria-hidden="true" />
                  {busy ? t('saving') : t('markComplete')}
                </button>
              )}
            </div>

            <p className="helper">{t('receipt')}</p>
          </div>
        )}
      </LoadBoundary>
    </>
  );
}

export function ContractorHome() {
  const { t } = useApp();
  const tasks = useLoad<Task[]>('/tasks');
  const incidents = useLoad<Incident[]>('/incidents');
  const workers = useLoad<Profile[]>('/workers');

  const counts = [
    { key: 'workers', count: workers.data?.length },
    { key: 'activeTasks', count: tasks.data?.filter(task => task.status !== 'completed').length },
    { key: 'completed', count: tasks.data?.filter(task => task.status === 'completed').length },
    { key: 'awaiting', count: tasks.data?.filter(task => task.status === 'assigned').length },
    { key: 'openIncidents', count: incidents.data?.filter(i => i.status !== 'closed_demo').length }
  ];

  return (
    <>
      <PageTitle
        title={t('overview')}
        subtitle={t('dayMessage')}
        action={
          <Link className="button" to="/contractor/tasks/new" aria-label={t('assign')}>
            <Plus size={20} aria-hidden="true" />
            {t('assign')}
          </Link>
        }
      />

      <div className="metric-grid">
        {counts.map(({ key, count }) => (
          <div className="card metric" key={key}>
            <span>{t(key as Key)}</span>
            <strong>{count ?? '—'}</strong>
          </div>
        ))}
      </div>

      {workers.error && <ErrorBox message={workers.error} retry={workers.refresh} />}

      <div className="dashboard-columns">
        <section>
          <div className="section-header">
            <h2>{t('tasks')}</h2>
            <Link to="/contractor/tasks">{t('viewAll')} →</Link>
          </div>
          <LoadBoundary load={tasks}>
            <div className="stack">
              {tasks.data?.slice(0, 4).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  contractor
                  workerName={workers.data?.find(w => w.id === task.assignedTo)?.displayName}
                />
              ))}
              {!tasks.data?.length && <Empty text={t('noTasks')} />}
            </div>
          </LoadBoundary>
        </section>

        <section>
          <div className="section-header">
            <h2>{t('incidents')}</h2>
            <Link to="/contractor/incidents">{t('viewAll')} →</Link>
          </div>
          <LoadBoundary load={incidents}>
            <div className="stack">
              {incidents.data?.slice(0, 4).map(i => (
                <IncidentCard key={i.id} incident={i} to={`/contractor/incidents/${i.id}`} />
              ))}
              {!incidents.data?.length && <Empty text={t('noReports')} />}
            </div>
          </LoadBoundary>
        </section>
      </div>

      <Refresh
        action={() => {
          tasks.refresh();
          incidents.refresh();
          workers.refresh();
        }}
        updatedAt={tasks.updatedAt}
      />
    </>
  );
}

export function AssignTask() {
  const { t } = useApp();
  const workers = useLoad<Profile[]>('/workers');
  const site = useLoad<Site>('/site');
  const navigate = useNavigate();

  const [assignedTo, setAssignedTo] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<Locale>('en');
  const [original, setOriginal] = useState<Translation>({
    title: '',
    instructions: '',
    safetyNotes: ''
  });
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');

  const [preview, setPreview] = useState<{
    translations: Partial<Record<Locale, Translation>>;
    previewToken: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const field = (key: keyof Translation, value: string) => {
    const normalized = normalizeIndicText(value);
    setOriginal(old => ({ ...old, [key]: normalized }));
    setPreview(undefined);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!preview) {
        setPreview(await post('/tasks/preview', { assignedTo, sourceLanguage, original }));
      } else {
        await post('/tasks', {
          assignedTo,
          sourceLanguage,
          original,
          location: normalizeIndicText(location),
          deadline: new Date(deadline).toISOString(),
          previewToken: preview.previewToken
        });
        navigate('/contractor/tasks');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t('assign')} back="/contractor/tasks" />

      <LoadBoundary load={workers}>
        <form className="card form-card stack" onSubmit={submit}>
          <label>
            {t('workerSelect')}
            <select
              required
              value={assignedTo}
              onChange={e => {
                setAssignedTo(e.target.value);
                setPreview(undefined);
              }}
            >
              <option value="">{t('choose')}</option>
              {workers.data?.map(w => (
                <option key={w.id} value={w.id}>
                  {w.displayName} · {languageNames[w.preferredLanguage]}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('location')}
            <input
              required
              maxLength={300}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={site.data?.name}
            />
          </label>

          <label>
            {t('title')}
            <input
              required
              minLength={2}
              maxLength={200}
              value={original.title}
              onChange={e => field('title', e.target.value)}
            />
          </label>

          <label>
            {t('instructions')}
            <textarea
              required
              minLength={3}
              maxLength={6000}
              rows={5}
              value={original.instructions}
              onChange={e => field('instructions', e.target.value)}
            />
          </label>

          <SpeechRecorder
            locale={sourceLanguage}
            disabled={busy}
            onText={text =>
              field('instructions', `${original.instructions}${original.instructions ? '\n' : ''}${text}`)
            }
          />

          <label>
            {t('safetyNotes')}
            <textarea
              maxLength={3000}
              rows={3}
              value={original.safetyNotes}
              onChange={e => field('safetyNotes', e.target.value)}
            />
          </label>

          <div className="form-row">
            <label>
              {t('deadline')}
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </label>

            <label>
              {t('sourceLanguage')}
              <select
                value={sourceLanguage}
                onChange={e => {
                  setSourceLanguage(e.target.value as Locale);
                  setPreview(undefined);
                }}
              >
                {Object.entries(languageNames).map(([id, text]) => (
                  <option key={id} value={id}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {preview && (
            <div className="translation-preview">
              <p className="notice">{t('checkTranslation')}</p>
              {Object.entries(preview.translations).map(([targetLocale, content]) => (
                <section key={targetLocale} lang={targetLocale}>
                  <span className="eyebrow">{languageNames[targetLocale as Locale]}</span>
                  <h3>{content.title}</h3>
                  <p>{content.instructions}</p>
                  {content.safetyNotes && <p className="warning-text">{content.safetyNotes}</p>}
                </section>
              ))}
            </div>
          )}

          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            className="button wide"
            disabled={busy || !workers.data?.length}
            aria-label={t(preview ? 'assign' : 'preview')}
          >
            {busy ? t('saving') : t(preview ? 'assign' : 'preview')}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </LoadBoundary>
    </>
  );
}

export function ReportIncident() {
  const { t, locale } = useApp();
  const site = useLoad<Site>('/site');

  const [category, setCategory] = useState<Category>();
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [location, setLocation] = useState('');
  const [text, setText] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Incident>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await post<Incident>('/incidents', {
        category,
        urgency,
        location: normalizeIndicText(location),
        originalText: normalizeIndicText(text),
        sourceLanguage: locale,
        requestId
      });
      setSaved(result);
      setRequestId(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t('reportIncident')} back="/worker" />
      <EmergencyBanner />
      <DemoBanner />

      {saved ? (
        <section className="card success-panel" role="status" aria-live="polite">
          <CheckCircle2 size={42} aria-hidden="true" />
          <h2>{t('savedReport')}</h2>
          <p className="record-id">{saved.id}</p>
          {saved.translationStatus === 'unavailable' && (
            <p className="notice">{t('translationUnavailable')}</p>
          )}
          <Link className="button" to="/worker/reports" aria-label={t('reports')}>
            {t('reports')}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <form className="card form-card stack" onSubmit={submit}>
          <fieldset>
            <legend>{t('whatHappened')}</legend>
            <div className="category-grid">
              {(['injury', 'hazard', 'unsafe_condition', 'near_miss', 'other'] as const).map(
                value => (
                  <label
                    className={`category ${category === value ? 'selected' : ''}`}
                    key={value}
                  >
                    <input
                      required
                      type="radio"
                      name="category"
                      value={value}
                      checked={category === value}
                      onChange={() => setCategory(value)}
                    />
                    <AlertTriangle size={24} aria-hidden="true" />
                    <span>{t(value)}</span>
                  </label>
                )
              )}
            </div>
          </fieldset>

          <label>
            {t('location')}
            <input
              required
              minLength={2}
              maxLength={300}
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={site.data?.name}
            />
          </label>

          <label>
            {t('urgency')}
            <select
              required
              value={urgency}
              onChange={e => setUrgency(e.target.value as Urgency)}
            >
              <option value="">{t('choose')}</option>
              {(['low', 'medium', 'high', 'urgent'] as const).map(value => (
                <option key={value} value={value}>
                  {t(value)}
                </option>
              ))}
            </select>
            <small className="helper">{t('urgencyHelp')}</small>
          </label>

          <SpeechRecorder
            locale={locale}
            disabled={busy}
            onText={transcript => setText(old => `${old}${old ? '\n' : ''}${transcript}`)}
          />

          <label>
            {t('description')}
            <textarea
              required
              rows={6}
              minLength={5}
              maxLength={6000}
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </label>
          <p className="helper">{t('typeInstead')}</p>

          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            className="button danger wide"
            disabled={busy}
            aria-label={t('submitReport')}
          >
            {busy ? t('saving') : t('submitReport')}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      )}
    </>
  );
}

export function IncidentTimeline({ incident }: { incident: Incident }) {
  const { t } = useApp();
  return (
    <section className="timeline-section">
      <h3>{t('timeline')}</h3>
      <ol className="timeline">
        {incident.events.map(event => (
          <li key={event.id}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{t(event.to)}</strong>
              <p className="meta">
                {t(event.actorRole)} · <DateText value={event.at} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function IncidentList() {
  const { profile, t } = useApp();
  const load = useLoad<Incident[]>('/incidents');
  const worker = profile?.role === 'worker';
  const hospital = profile?.role === 'hospital_responder';
  const [filter, setFilter] = useState('all');

  const reports = (load.data || []).filter(i =>
    filter === 'all'
      ? true
      : filter === 'closed_demo'
      ? i.status === 'closed_demo'
      : i.status !== 'closed_demo'
  );

  return (
    <>
      <PageTitle title={t(worker ? 'reports' : hospital ? 'inbox' : 'incidents')} />
      {worker && <DemoBanner />}

      <div className="filters" role="group" aria-label={t('incidents')}>
        {(['all', 'reported', 'closed_demo'] as const).map(value => (
          <button
            type="button"
            key={value}
            className={filter === value ? 'selected' : ''}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {t(value === 'reported' ? 'openIncidents' : value)}
          </button>
        ))}
      </div>

      <LoadBoundary load={load}>
        {reports.length ? (
          <div className="card-grid">
            {reports.map(i => (
              <IncidentCard
                key={i.id}
                incident={i}
                to={worker ? undefined : `${hospital ? '/hospital' : '/contractor/incidents'}/${i.id}`}
              >
                <IncidentTimeline incident={i} />
              </IncidentCard>
            ))}
          </div>
        ) : (
          <Empty text={t('noReports')} />
        )}
      </LoadBoundary>

      <Refresh action={load.refresh} updatedAt={load.updatedAt} />
    </>
  );
}

export function IncidentDetail() {
  const { id } = useParams();
  const { t, locale, profile } = useApp();
  const load = useLoad<Incident>(`/incidents/${encodeURIComponent(id!)}`);
  const site = useLoad<Site>('/site');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const incident = load.data;
  const hospital = profile?.role === 'hospital_responder';

  async function action(name: string) {
    setBusy(true);
    setError('');
    try {
      load.setData(await post<Incident>(`/incidents/${id}/${name}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeTranslation =
    (incident?.translations && incident.translations[locale]) ||
    (locale === 'en' ? incident?.englishTranslation : null);

  return (
    <>
      <PageTitle
        title={t('reportDetail')}
        back={hospital ? '/hospital' : '/contractor/incidents'}
      />
      <DemoBanner />
      {hospital && <EmergencyBanner />}

      <LoadBoundary load={load}>
        {incident && (
          <div className="stack">
            <section className="card stack">
              <div className="card-top">
                <Status value={incident.status} />
                <span className={`urgency urgency-${incident.urgency}`}>
                  {t('urgency')}: {t(incident.urgency)}
                </span>
              </div>

              <h2>{t(incident.category)}</h2>
              <p className="record-id">{incident.id}</p>
              <DateText value={incident.createdAt} />

              <section>
                <h3>
                  {t('original')} · {t(incident.sourceLanguage as Key)}
                </h3>
                <p className="instruction" lang={incident.sourceLanguage}>
                  {incident.originalText}
                </p>
              </section>

              {locale !== incident.sourceLanguage && (
                <section className="translation-box">
                  <h3>
                    {locale === 'en'
                      ? t('englishTranslation')
                      : `${t(locale as Key)} ${t('preview')}`}
                  </h3>
                  {activeTranslation ? (
                    <p className="instruction" lang={locale}>
                      {activeTranslation}
                    </p>
                  ) : (
                    <>
                      <p>{t('translationUnavailable')}</p>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void action('retry-translation')}
                      >
                        {t('retryTranslation')}
                      </button>
                    </>
                  )}
                </section>
              )}

              {/* Complete Clinical SBAR Emergency Handover Protocol Panel */}
              {incident.sbarHandover && (
                <section className="sbar-card">
                  <div className="section-header">
                    <h3>
                      <ShieldCheck size={18} aria-hidden="true" /> {t('sbarHandover')}
                    </h3>
                    <span className="badge">{t('clinicalSbarBadge')}</span>
                  </div>

                  <div className="sbar-grid">
                    <div className="sbar-cell">
                      <strong>{t('sbarSituation')} (S):</strong>
                      <p>{incident.sbarHandover.situation}</p>
                      {incident.sbarHandover.injuryType && (
                        <small>{t('trauma')}: {incident.sbarHandover.injuryType}</small>
                      )}
                    </div>

                    <div className="sbar-cell">
                      <strong>{t('sbarBackground')} (B):</strong>
                      <p>{incident.sbarHandover.background}</p>
                      {incident.sbarHandover.ppeStatus && (
                        <small>{t('ppe')}: {incident.sbarHandover.ppeStatus}</small>
                      )}
                    </div>

                    <div className="sbar-cell">
                      <strong>{t('sbarAssessment')} (A):</strong>
                      <p>{incident.sbarHandover.assessment}</p>
                      {incident.sbarHandover.consciousnessState && (
                        <small>{t('vitals')}: {incident.sbarHandover.consciousnessState}</small>
                      )}
                    </div>

                    <div className="sbar-cell">
                      <strong>{t('sbarRecommendation')} (R):</strong>
                      <p>{incident.sbarHandover.recommendation}</p>
                      {incident.sbarHandover.bocwInsuranceId && (
                        <small>{t('bocwPolicy')}: {incident.sbarHandover.bocwInsuranceId}</small>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <dl className="details-grid">
                <div>
                  <dt>{t('location')}</dt>
                  <dd>
                    {site.data?.name}
                    <br />
                    {incident.location}
                  </dd>
                </div>
                <div>
                  <dt>{t('worker')}</dt>
                  <dd className="record-id">{incident.reporterId}</dd>
                </div>
                <div>
                  <dt>{t('contact')}</dt>
                  <dd>{site.data?.contact || '—'}</dd>
                </div>
              </dl>

              <IncidentTimeline incident={incident} />
            </section>

            {error && <ErrorBox message={error} />}

            <div className="button-row">
              {hospital && ['reported', 'reviewed'].includes(incident.status) && (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => void action('acknowledge-demo')}
                >
                  {t('acknowledgeDemo')}
                </button>
              )}
              {hospital && incident.status === 'acknowledged_demo' && (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => void action('follow-up-demo')}
                >
                  {t('followUp')}
                </button>
              )}
              {hospital &&
                ['acknowledged_demo', 'follow_up_demo'].includes(incident.status) && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void action('close-demo')}
                  >
                    {t('closeDemo')}
                  </button>
                )}
              {!hospital && incident.status === 'reported' && (
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => void action('review')}
                >
                  {t('review')}
                </button>
              )}
            </div>

            <p className="helper">{t('noDispatch')}</p>
          </div>
        )}
      </LoadBoundary>

      <Refresh action={load.refresh} updatedAt={load.updatedAt} />
    </>
  );
}

export function WagePage() {
  const { t, profile, locale } = useApp();
  const load = useLoad<Wage[]>('/wages');
  const contractor = profile?.role === 'contractor';
  const workers = useLoad<Profile[]>(contractor ? '/workers' : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const money = (amount: number) =>
    new Intl.NumberFormat(`${locale}-IN`, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const data: Record<string, unknown> = Object.fromEntries(fields);

    for (const key of [
      'dailyRate',
      'daysWorked',
      'overtimeHours',
      'overtimeRate',
      'deductions',
      'paidAmount'
    ]) {
      data[key] = Number(data[key]);
    }

    if (typeof data.deductionReason === 'string') {
      data.deductionReason = normalizeIndicText(data.deductionReason);
    }

    setBusy(true);
    setError('');
    try {
      await post('/wages', data);
      form.reset();
      load.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function dispute(id: string) {
    setBusy(true);
    setError('');
    try {
      await post(`/wages/${id}/dispute`);
      load.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={t('wages')} back={contractor ? '/contractor' : '/worker'} />

      <div className="section-header">
        <p className="notice">{t('wageHelp')}</p>
        <span className="badge">{t('bocwCompliance')}</span>
      </div>

      {contractor && (
        <details className="card wage-form">
          <summary>
            <Plus size={20} aria-hidden="true" />
            {t('addWage')}
          </summary>

          <form className="stack" onSubmit={submit}>
            <label>
              {t('workerSelect')}
              <select name="workerId" required defaultValue="">
                <option value="">{t('choose')}</option>
                {workers.data?.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.displayName}
                  </option>
                ))}
              </select>
            </label>

            {workers.error && <ErrorBox message={workers.error} retry={workers.refresh} />}

            <label>
              {t('workDate')}
              <input name="workDate" type="date" required />
            </label>

            <div className="form-row">
              {(
                [
                  'dailyRate',
                  'daysWorked',
                  'overtimeHours',
                  'overtimeRate',
                  'deductions',
                  'paidAmount'
                ] as const
              ).map(key => (
                <label key={key}>
                  {t(key)}
                  <input
                    name={key}
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={key === 'daysWorked' ? 1 : 0}
                  />
                </label>
              ))}
            </div>

            <label>
              {t('deductionReason')}
              <input name="deductionReason" maxLength={300} placeholder={t('deductionReasonPlaceholder')} />
            </label>

            <label>
              {t('source')}
              <select name="source">
                <option value="recorded">{t('recorded')}</option>
                <option value="agreed">{t('agreed')}</option>
              </select>
            </label>

            <button type="submit" className="button" disabled={busy} aria-label={t('addWage')}>
              {busy ? t('saving') : t('addWage')}
            </button>
          </form>
        </details>
      )}

      {error && <ErrorBox message={error} />}

      <LoadBoundary load={load}>
        {load.data?.length ? (
          <div className="card-grid">
            {load.data.map(w => {
              const statutoryOtRate = statutoryBocwOvertimeRate(w.dailyRate);
              return (
                <article className="card wage-card" key={w.id}>
                  <div className="card-top">
                    <strong>{w.workDate}</strong>
                    <span className="badge">{t(w.source)}</span>
                  </div>

                  {contractor && (
                    <h3>
                      {workers.data?.find(worker => worker.id === w.workerId)?.displayName ||
                        w.workerId}
                    </h3>
                  )}

                  <dl className="wage-lines">
                    {[
                      { key: 'dailyRate', value: money(w.dailyRate) },
                      { key: 'daysWorked', value: String(w.daysWorked) },
                      {
                        key: 'overtimeHours',
                        value: `${w.overtimeHours} × ${money(w.overtimeRate)}`
                      },
                      { key: 'deductions', value: money(w.deductions) },
                      { key: 'paidAmount', value: money(w.paidAmount) }
                    ].map(({ key, value }) => (
                      <div key={key}>
                        <dt>{t(key as Key)}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {w.deductionReason && (
                    <p className="helper">
                      <strong>{t('deductions')}:</strong> {w.deductionReason}
                    </p>
                  )}

                  <div className="wage-total">
                    <span>{t('expected')}</span>
                    <strong>{money(expectedWage(w))}</strong>
                  </div>

                  <p className="helper">
                    {money(w.dailyRate)} × {w.daysWorked} + {w.overtimeHours} × {money(w.overtimeRate)} −{' '}
                    {money(w.deductions)}
                  </p>

                  <p>
                    {t('balance')}: <strong>{money(expectedWage(w) - w.paidAmount)}</strong>
                  </p>

                  {w.overtimeRate >= statutoryOtRate && w.overtimeHours > 0 && (
                    <small className="teal" style={{ display: 'block', margin: '4px 0' }}>
                      ✓ {t('bocwCompliance')} ({t('bocwOvertime')}: {money(statutoryOtRate)}/hr)
                    </small>
                  )}

                  {w.disputed ? (
                    <div className="notice" role="alert">
                      <strong>{t('disputed')}</strong>
                      <p className="helper" style={{ marginTop: '4px' }}>
                        {w.disputeReason || t('disputePrompt')}
                      </p>
                    </div>
                  ) : (
                    !contractor && (
                      <button
                        type="button"
                        className="button secondary wide"
                        disabled={busy}
                        onClick={() => void dispute(w.id)}
                        aria-label={t('dispute')}
                      >
                        {t('dispute')}
                      </button>
                    )
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty text={t('noWages')} />
        )}
      </LoadBoundary>

      <Refresh action={load.refresh} updatedAt={load.updatedAt} />
    </>
  );
}
