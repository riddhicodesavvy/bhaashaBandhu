import React, { useEffect, useRef, useState, memo, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Home,
  Languages,
  LogOut,
  Mic,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Square,
  Volume2,
  Wallet,
  Inbox,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import { useApp } from './context';
import { api } from './api';
import { languageNames, type Key } from './i18n';
import type { Incident, Locale, Site, Task } from '../shared/types';

export const Brand = memo(function Brand({ full = false }: { full?: boolean }) {
  const { t } = useApp();
  return (
    <div className="brand">
      <span className="brand-icon">
        <ShieldCheck size={30} />
      </span>
      <div>
        <span className="wordmark">
          Bhasha<span>Bandhu</span>
        </span>
        {full && <p>{t('tagline')}</p>}
      </div>
    </div>
  );
});

export function LanguagePicker() {
  const { locale, changeLocale, t } = useApp();
  return (
    <label className="language" aria-label={t('language')}>
      <Languages size={18} aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select
        aria-label={t('language')}
        value={locale}
        onChange={e => void changeLocale(e.target.value as Locale)}
      >
        {Object.entries(languageNames).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  const { t } = useApp();
  return (
    <div className="error-box" role="alert" aria-live="assertive">
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <p>{message}</p>
        {retry && (
          <button type="button" className="text-button" onClick={retry}>
            <RefreshCw size={16} aria-hidden="true" />
            {t('retry')}
          </button>
        )}
      </div>
    </div>
  );
}

export function Loading() {
  const { t } = useApp();
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {t('loading')}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="empty" role="status">
      <ClipboardList size={30} aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function DemoBanner() {
  const { t } = useApp();
  return (
    <div className="demo-banner" role="note">
      <AlertTriangle size={22} aria-hidden="true" />
      <p>{t('demoBanner')}</p>
    </div>
  );
}

export function EmergencyBanner() {
  const { t } = useApp();
  return (
    <div className="emergency">
      <a href="tel:112" aria-label={`${t('call112')} - National Emergency Number`}>
        <Phone size={28} aria-hidden="true" />
        <span>{t('call112')}</span>
        <span aria-hidden="true">↗</span>
      </a>
      <p>{t('noDispatch')}</p>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  back,
  action
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Link className="back" to={back} aria-label={`${t('back')} (${back})`}>
            <ArrowLeft size={18} aria-hidden="true" />
            {t('back')}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Status = memo(function Status({ value }: { value: string }) {
  const { t } = useApp();
  return (
    <span className={`status status-${value}`}>
      <span className="status-dot" aria-hidden="true" />
      {t(value as Key)}
    </span>
  );
});

export const DateText = memo(function DateText({ value }: { value: string }) {
  const { locale } = useApp();
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat(`${locale}-IN`, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      }).format(new Date(value))}
    </time>
  );
});

export const TaskCard = memo(function TaskCard({
  task,
  contractor = false,
  workerName
}: {
  task: Task;
  contractor?: boolean;
  workerName?: string;
}) {
  const { locale, t } = useApp();
  const translated =
    task.sourceLanguage === locale ? task.original : task.translations[locale];

  const content = (
    <>
      <div className="card-top">
        <Status value={task.status} />
        <ClipboardList size={19} className="muted" aria-hidden="true" />
      </div>
      <h3 lang={translated ? locale : task.sourceLanguage}>
        {(translated || task.original).title}
      </h3>
      {!translated && (
        <small className="warning-text">{t('translationUnavailable')}</small>
      )}
      <p className="muted">{task.location}</p>
      <p className="meta">
        <DateText value={task.deadline} />
      </p>
      {contractor && (
        <p className="meta">{workerName || task.assignedTo}</p>
      )}
    </>
  );

  return contractor ? (
    <details className="card task-card">
      <summary>{content}</summary>
      <div className="detail-body">
        <p lang={translated ? locale : task.sourceLanguage}>
          {(translated || task.original).instructions}
        </p>
        {(translated || task.original).safetyNotes && (
          <p className="notice" lang={translated ? locale : task.sourceLanguage}>
            {(translated || task.original).safetyNotes}
          </p>
        )}
        {task.acknowledgedAt && (
          <p>
            {t('acknowledged')}: <DateText value={task.acknowledgedAt} />
          </p>
        )}
      </div>
    </details>
  ) : (
    <Link
      className="card task-card link-card"
      to={`/worker/tasks/${task.id}`}
      aria-label={`${(translated || task.original).title} - ${task.location}`}
    >
      {content}
      <span className="card-arrow" aria-hidden="true">→</span>
    </Link>
  );
});

export const IncidentCard = memo(function IncidentCard({
  incident,
  to,
  children
}: {
  incident: Incident;
  to?: string;
  children?: ReactNode;
}) {
  const { locale, t } = useApp();
  const previewText =
    (incident.translations && incident.translations[locale]) ||
    (locale === 'en' && incident.englishTranslation ? incident.englishTranslation : null) ||
    (incident.sourceLanguage === locale ? incident.originalText : null) ||
    incident.englishTranslation ||
    incident.originalText;

  const content = (
    <>
      <div className="card-top">
        <Status value={incident.status} />
        <span className={`urgency urgency-${incident.urgency}`}>
          {t(incident.urgency)}
        </span>
      </div>
      <h3>{t(incident.category)}</h3>
      <p>{incident.location}</p>
      <p className="report-preview" lang={locale}>
        {previewText}
      </p>
      <p className="meta">
        <DateText value={incident.createdAt} /> · {t(incident.sourceLanguage as Key)}
      </p>
    </>
  );

  return to ? (
    <Link className="card incident-card link-card" to={to} aria-label={`${t(incident.category)} at ${incident.location}`}>
      {content}
      <span className="text-link">{t('viewReport')} →</span>
    </Link>
  ) : (
    <details className="card incident-card">
      <summary>{content}</summary>
      {children}
    </details>
  );
});

export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError('');
    api<T>(path)
      .then(result => {
        if (alive) {
          setData(result);
          setUpdatedAt(new Date().toISOString());
        }
      })
      .catch(e => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [path, revision]);

  return {
    data,
    error,
    loading,
    updatedAt,
    refresh: () => setRevision(v => v + 1),
    setData
  };
}

export function Refresh({ action, updatedAt }: { action: () => void; updatedAt?: string }) {
  const { t } = useApp();
  return (
    <div className="refresh-row">
      {updatedAt && (
        <small className="muted">
          {t('lastUpdated')}: <DateText value={updatedAt} />
        </small>
      )}
      <button
        type="button"
        className="text-button"
        onClick={action}
        aria-label={t('refresh')}
      >
        <RefreshCw size={16} aria-hidden="true" />
        {t('refresh')}
      </button>
    </div>
  );
}

export function SpeakButton({ text, locale }: { text: string; locale: Locale }) {
  const { t } = useApp();
  const [message, setMessage] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak() {
    setMessage('');
    if (!('speechSynthesis' in window)) {
      setMessage(t('noVoice'));
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.lang.toLowerCase() === `${locale}-in`) ||
      voices.find(v => v.lang.toLowerCase().startsWith(locale));

    if (!voice) {
      setMessage(t('noVoice'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setMessage(t('noVoice'));
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div>
      <button
        type="button"
        className="button soft wide"
        onClick={speak}
        aria-label={t(speaking ? 'stop' : 'listen')}
      >
        {speaking ? <Square size={19} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}{' '}
        {t(speaking ? 'stop' : 'listen')}
      </button>
      {message && (
        <p className="notice" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}

export function SpeechRecorder({
  onText,
  locale,
  disabled = false
}: {
  onText: (text: string) => void;
  locale: Locale;
  disabled?: boolean;
}) {
  const { t } = useApp();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const discard = useRef(false);
  const mounted = useRef(true);

  const [state, setState] = useState<'idle' | 'permission' | 'recording' | 'uploading'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  function cleanup() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discard.current = true;
      if (recorder.current?.state === 'recording') {
        recorder.current.stop();
      }
      cleanup();
    };
  }, []);

  async function start() {
    setError('');
    discard.current = false;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(t('micDenied'));
      return;
    }
    setState('permission');
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || discard.current) {
        audio.getTracks().forEach(track => track.stop());
        if (mounted.current) setState('idle');
        return;
      }
      stream.current = audio;
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      const mimeType =
        candidates.find(type => {
          try {
            return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type);
          } catch {
            return false;
          }
        }) || '';

      const media = mimeType ? new MediaRecorder(audio, { mimeType }) : new MediaRecorder(audio);
      recorder.current = media;
      const chunks: BlobPart[] = [];
      let bytes = 0;

      media.ondataavailable = event => {
        chunks.push(event.data);
        bytes += event.data.size;
        if (bytes > 3 * 1024 * 1024 && media.state === 'recording') {
          discard.current = true;
          setError(t('micDenied'));
          media.stop();
        }
      };

      media.onstop = async () => {
        cleanup();
        if (!mounted.current) return;
        if (discard.current) {
          setState('idle');
          return;
        }
        setState('uploading');
        const finalType = media.mimeType || mimeType || 'audio/webm';
        const form = new FormData();
        form.append('audio', new Blob(chunks, { type: finalType }), 'recording');
        form.append('language', locale);
        try {
          const result = await api<{ text: string }>('/audio/transcribe', {
            method: 'POST',
            body: form
          });
          if (mounted.current) onText(result.text);
        } catch (e) {
          if (mounted.current) setError((e as Error).message);
        } finally {
          if (mounted.current) setState('idle');
        }
      };

      media.onerror = () => {
        discard.current = true;
        cleanup();
        if (mounted.current) {
          setState('idle');
          setError(t('micDenied'));
        }
      };

      media.start(1000);
      setSeconds(0);
      setState('recording');
      const started = Date.now();
      timer.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - started) / 1000));
        if (Date.now() - started >= 60000 && media.state === 'recording') {
          media.stop();
        }
      }, 500);
    } catch {
      cleanup();
      if (mounted.current) {
        setState('idle');
        setError(t('micDenied'));
      }
    }
  }

  function cancel() {
    discard.current = true;
    if (recorder.current?.state === 'recording') {
      recorder.current.stop();
    }
    cleanup();
    setState('idle');
  }

  return (
    <div className="recorder">
      <div className="sr-only" aria-live="polite">
        {state === 'recording'
          ? `${t('record')} - ${seconds} seconds elapsed`
          : state === 'uploading'
          ? t('transcribing')
          : ''}
      </div>

      <div className="button-row">
        {state === 'recording' ? (
          <>
            <button
              type="button"
              className="button danger"
              onClick={() => recorder.current?.stop()}
              aria-label={`${t('stop')} recording, ${seconds} seconds`}
            >
              <Square size={18} aria-hidden="true" />
              {t('stop')} · {seconds}s
            </button>
            <div className="recording-live-pill" aria-hidden="true">
              <span className="status-dot" style={{ background: '#ef4444' }} />
              <span className="audio-meter">
                <span className="audio-bar" />
                <span className="audio-bar" />
                <span className="audio-bar" />
                <span className="audio-bar" />
                <span className="audio-bar" />
              </span>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="button soft"
            disabled={disabled || state !== 'idle'}
            onClick={start}
            aria-label={
              state === 'uploading'
                ? t('transcribing')
                : state === 'permission'
                ? t('loading')
                : t('record')
            }
          >
            <Mic size={19} aria-hidden="true" />
            {state === 'uploading'
              ? t('transcribing')
              : state === 'permission'
              ? t('loading')
              : t('record')}
          </button>
        )}

        {(state === 'recording' || state === 'permission') && (
          <button
            type="button"
            className="button secondary"
            onClick={cancel}
            aria-label={t('cancel')}
          >
            {t('cancel')}
          </button>
        )}
      </div>

      <p className="helper">{t('micHelp')}</p>
      {error && <ErrorBox message={error} />}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, t, logout, error } = useApp();
  const location = useLocation();
  const site = useLoad<Site>('/site');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!profile) return null;

  const worker = profile.role === 'worker';
  const links = worker
    ? [
        { to: '/worker', key: 'home', Icon: Home },
        { to: '/worker/tasks', key: 'tasks', Icon: ClipboardList },
        { to: '/worker/report', key: 'report', Icon: AlertTriangle },
        { to: '/worker/reports', key: 'reports', Icon: FileText }
      ]
    : profile.role === 'contractor'
    ? [
        { to: '/contractor', key: 'overview', Icon: LayoutDashboard },
        { to: '/contractor/tasks', key: 'tasks', Icon: ClipboardList },
        { to: '/contractor/tasks/new', key: 'assign', Icon: Plus },
        { to: '/contractor/incidents', key: 'incidents', Icon: AlertTriangle },
        { to: '/contractor/wages', key: 'wages', Icon: Wallet }
      ]
    : [{ to: '/hospital', key: 'inbox', Icon: Inbox }];

  const nav = links.map(({ to, key, Icon }) => (
    <NavLink
      end
      to={to}
      key={to}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'active' : ''} ${key === 'report' ? 'report-nav' : ''}`
      }
      aria-label={t(key as Key)}
    >
      <Icon size={21} aria-hidden="true" />
      <span>{t(key as Key)}</span>
    </NavLink>
  ));

  return (
    <div className={`app ${worker ? 'worker-app' : 'workspace-app'}`}>
      <a href="#main-content" className="skip-link">
        {t('skipLink')}
      </a>

      <header className="app-header">
        <Brand />
        <div className="header-actions">
          <LanguagePicker />
          <button
            type="button"
            className="icon-button"
            title={t('logout')}
            aria-label={t('logout')}
            onClick={() => void logout()}
          >
            <LogOut size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!worker && (
        <aside className="sidebar">
          <div className="sidebar-heading">
            <span className="eyebrow">{t('demoData')}</span>
            <strong>{t(profile.role)}</strong>
          </div>
          <nav aria-label={t('home')}>{nav}</nav>
          <p className="sidebar-footer">{t('tagline')}</p>
        </aside>
      )}

      <div className="content-wrap">
        <div className="site-strip">
          <span>
            <span className="status-dot" aria-hidden="true" />
            {site.data?.name || t(profile.role)}
          </span>
          <span className="demo-chip">DEMO</span>
        </div>

        {!online && <ErrorBox message={t('offline')} />}
        {error && <ErrorBox message={error} />}

        <main id="main-content" tabIndex={-1}>
          {profile.role === 'hospital_responder' && <DemoBanner />}
          {children}
        </main>

        <footer className="content-footer">
          <ShieldCheck size={15} aria-hidden="true" />
          {t('demoData')}
        </footer>
      </div>

      {worker && (
        <nav className="worker-nav" aria-label={t('home')}>
          {nav}
        </nav>
      )}
    </div>
  );
}
