import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type Auth, type User } from 'firebase/auth';
import { api, setAuth } from './api';
import { translate, type Key } from './i18n';
import type { Profile, Locale } from '../shared/types';

interface Context {
  auth?: Auth;
  user: User | null;
  profile: Profile | null;
  busy: boolean;
  error: string;
  configError: string;
  demo: boolean;
  locale: Locale;
  t: (key: Key) => string;
  changeLocale: (l: Locale) => Promise<void>;
  reload: () => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<Context>(null!);

/**
 * Access the active application context (auth, profile, translations, locale).
 */
export const useApp = () => useContext(AppContext);

/**
 * Application context provider managing Firebase authentication state,
 * user profile synchronization, and Indic locale preferences.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [auth, updateAuth] = useState<Auth>();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');
  const demo = import.meta.env.VITE_DEMO_MODE === 'true';
  const [revision, setRevision] = useState(0);
  const languageRequest = useRef(0);

  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('bb-language');
    return saved === 'hi' || saved === 'bn' ? saved : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('bb-language', locale);
  }, [locale]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let alive = true;
    let identityRevision = 0;

    setBusy(true);
    setConfigError('');
    setError('');

    import('./firebase')
      .then(async ({ auth: firebaseAuth, authReady }) => {
        await authReady;
        if (!alive) return;

        setAuth(firebaseAuth);
        updateAuth(firebaseAuth);

        unsubscribe = onIdTokenChanged(firebaseAuth, async (current) => {
          const currentRevision = ++identityRevision;
          if (!alive) return;

          setUser(current);
          setProfile(null);
          setError('');
          setBusy(true);

          if (current) {
            try {
              const p = await api<Profile>('/me');
              if (alive && currentRevision === identityRevision) {
                setProfile(p);
                setLocale(p.preferredLanguage);
              }
            } catch (e) {
              if (alive && currentRevision === identityRevision) {
                setError((e as Error).message);
              }
            }
          }

          if (alive && currentRevision === identityRevision) {
            setBusy(false);
          }
        });
      })
      .catch((e) => {
        if (alive) {
          setConfigError(e.message);
          setBusy(false);
        }
      });

    return () => {
      alive = false;
      identityRevision++;
      unsubscribe?.();
    };
  }, [revision]);

  const changeLocale = async (l: Locale) => {
    const sequence = ++languageRequest.current;
    setLocale(l);

    if (profile) {
      try {
        const p = await api<Profile>('/me/language', {
          method: 'PATCH',
          body: JSON.stringify({ language: l })
        });
        if (sequence === languageRequest.current && auth?.currentUser?.uid === p.id) {
          setProfile(p);
        }
      } catch (e) {
        if (sequence === languageRequest.current && auth?.currentUser) {
          setError((e as Error).message);
        }
      }
    }
  };

  const handleLogout = async () => {
    languageRequest.current++;
    if (auth) {
      await signOut(auth);
    }
    setError('');
    setProfile(null);
    setUser(null);
  };

  return (
    <AppContext.Provider
      value={{
        auth,
        user,
        profile,
        busy,
        error,
        configError,
        demo,
        locale,
        t: (key) => translate(locale, key),
        changeLocale,
        reload: () => setRevision((v) => v + 1),
        logout: handleLogout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
