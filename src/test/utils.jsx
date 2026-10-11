import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';

// Renders UI inside the same providers the app uses.
export function renderWithProviders(ui, { route = '/', withAuth = true } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = withAuth ? <AuthProvider>{ui}</AuthProvider> : ui;
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

// fetch mock driven by a route table: { 'POST /auth/login': (body) => ({ status, json }) }
export function mockFetch(routes) {
  const calls = [];
  const fn = vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname.replace(/^\/api\/v1/, '');
    const key = `${init.method || 'GET'} ${path}`;
    const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ key, body, headers: init.headers || {} });
    const handler = routes[key];
    if (!handler) return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: `No mock for ${key}` } }), { status: 404 });
    const { status = 200, json } = await handler(body, init, calls);
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

export const ok = (data, extra = {}) => ({ status: 200, json: { success: true, data, ...extra } });
export const fail = (status, code, message, details) => ({ status, json: { success: false, error: { code, message, details } } });
