import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { AppShell, Loading, ErrorBox } from './components';
import {
  Login,
  WorkerHome,
  TaskList,
  TaskDetail,
  ContractorHome,
  AssignTask,
  ReportIncident,
  IncidentList,
  IncidentDetail,
  WagePage
} from './pages';
import { home, type Role } from '../shared/types';
import './styles.css';

/**
 * Route guard enforcing role-based access control and profile hydration.
 */
function Protected({ role }: { role: Role }) {
  const { user, profile, busy, error, logout, reload, t } = useApp();

  if (busy) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (!profile) {
    return (
      <div className="session-error">
        <h1>{t('sessionError')}</h1>
        <ErrorBox message={error} retry={reload} />
        <button className="button" onClick={() => void logout()}>
          {t('logout')}
        </button>
      </div>
    );
  }

  if (profile.role !== role) {
    return <Navigate replace to={home[profile.role]} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

/**
 * Entry router redirecting authenticated users to their respective home screen.
 */
function Entry() {
  const { profile } = useApp();
  return <Navigate replace to={profile ? home[profile.role] : '/login'} />;
}

/**
 * 404 Not Found fallback view.
 */
function NotFound() {
  const { t } = useApp();
  return (
    <div className="session-error">
      <h1>{t('notFound')}</h1>
      <a href="/">{t('home')}</a>
    </div>
  );
}

/**
 * Top-level React error boundary for graceful crash recovery.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="session-error">
          <h1>BhashaBandhu</h1>
          <p>The page could not be loaded. Reload to try again.</p>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root DOM element #root not found.');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AppProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/login" element={<Login />} />

          {/* Worker Routes */}
          <Route element={<Protected role="worker" />}>
            <Route path="/worker" element={<WorkerHome />} />
            <Route path="/worker/tasks" element={<TaskList />} />
            <Route path="/worker/tasks/:id" element={<TaskDetail />} />
            <Route path="/worker/report" element={<ReportIncident />} />
            <Route path="/worker/reports" element={<IncidentList />} />
            <Route path="/worker/wages" element={<WagePage />} />
          </Route>

          {/* Contractor Routes */}
          <Route element={<Protected role="contractor" />}>
            <Route path="/contractor" element={<ContractorHome />} />
            <Route path="/contractor/tasks" element={<TaskList contractor />} />
            <Route path="/contractor/tasks/new" element={<AssignTask />} />
            <Route path="/contractor/incidents" element={<IncidentList />} />
            <Route path="/contractor/incidents/:id" element={<IncidentDetail />} />
            <Route path="/contractor/wages" element={<WagePage />} />
          </Route>

          {/* Hospital / First Responder Routes */}
          <Route element={<Protected role="hospital_responder" />}>
            <Route path="/hospital" element={<IncidentList />} />
            <Route path="/hospital/:id" element={<IncidentDetail />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
