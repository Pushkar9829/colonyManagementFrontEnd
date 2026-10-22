import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';
import { installGlobalErrorHandlers } from './components/layout/ErrorBoundary';
import { applyStoredTemplate } from './lib/template';

installGlobalErrorHandlers();
// Paint in the colony's last template (and dark mode) before React renders; the API confirms it after.
applyStoredTemplate();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable app + offline page + web push. Skipped in dev to avoid caching surprises with Vite.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
