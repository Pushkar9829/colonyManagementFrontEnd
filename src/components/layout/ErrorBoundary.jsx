import { Component } from 'react';
import { BASE_URL } from '../../api/client';

// Sends a crash report to the API (which forwards it to the team's error webhook). Never throws.
export function reportClientError(error, extra = {}) {
  try {
    const body = JSON.stringify({
      message: String(error?.message || error).slice(0, 1000),
      stack: String(error?.stack || '').slice(0, 4000) || undefined,
      url: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 300),
      ...extra,
    });
    const url = `${BASE_URL}/client-errors`;
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* reporting must never break the app */
  }
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || import.meta.env.DEV) return;
  installed = true;
  window.addEventListener('error', (e) => reportClientError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason || 'Unhandled promise rejection'));
}

// Catches render crashes so one broken page shows a friendly message instead of a blank screen.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    reportClientError(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Something went wrong on this page</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">The team has been notified. Try reloading; if it keeps happening, go back to the dashboard.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Reload</button>
          <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Dashboard</a>
        </div>
      </div>
    );
  }
}
