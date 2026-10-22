import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyStoredTemplate, applyTemplate, cacheTemplate, CLASSIC, prefersDark, readPreview } from '../../lib/template';

const root = document.documentElement;
const tpl = (key, extra = {}) => ({
  key,
  name: key,
  darkFirst: false,
  header: 'brand',
  sidebar: 'dark',
  home: 'tiles',
  login: 'centered-card',
  buttons: 'soft',
  icons: 'square',
  shadow: 'flat',
  radii: { sm: '1px', md: '2px', lg: '3px', xl: '4px', '2xl': '5px', '3xl': '6px', button: '9999px' },
  fonts: { body: 'Georgia, serif', heading: 'Impact, sans-serif' },
  palette: { brand: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#0d9488', 600: '#0f766e', 700: '#115e59', 800: '#134e4a', 900: '#123f3c', 950: '#042f2e' }, accent: '#0284c7', successSurface: '#ecfdf5', warningSurface: '#fffbeb' },
  ...extra,
});
const cssVar = (name) => root.style.getPropertyValue(name);

function resetRoot() {
  root.removeAttribute('style');
  for (const a of [...root.attributes]) if (a.name.startsWith('data-')) root.removeAttribute(a.name);
  root.classList.remove('dark');
  sessionStorage.clear();
  localStorage.clear();
}

describe('applyTemplate', () => {
  beforeEach(resetRoot);

  it('sets the palette, radius and fonts as CSS variables and the layout choices as data attributes', () => {
    applyTemplate(tpl('ocean-teal'));
    expect(cssVar('--tpl-brand-600')).toBe('#0f766e');
    expect(cssVar('--tpl-brand-50')).toBe('#f0fdfa');
    expect(cssVar('--tpl-accent')).toBe('#0284c7');
    expect(cssVar('--tpl-radius-button')).toBe('9999px');
    expect(cssVar('--tpl-font-heading')).toBe('Impact, sans-serif');
    expect(root.dataset).toMatchObject({ template: 'ocean-teal', header: 'brand', sidebar: 'dark', home: 'tiles', login: 'centered-card', buttons: 'soft', icons: 'square', shadow: 'flat' });
  });

  it('Classic (no template) clears the variables so index.css defaults show', () => {
    applyTemplate(tpl('ocean-teal'));
    applyTemplate(null);
    expect(cssVar('--tpl-brand-600')).toBe('');
    expect(cssVar('--tpl-radius-lg')).toBe('');
    expect(root.dataset.template).toBe(CLASSIC.key);
    expect(root.dataset.header).toBe('white');
  });

  it('announces dark-first templates; they start dark only without a saved theme choice', () => {
    const seen = vi.fn();
    root.addEventListener('cms:template', (e) => seen(e.detail));
    applyTemplate(tpl('night-sky', { darkFirst: true }));
    expect(seen).toHaveBeenCalledWith({ key: 'night-sky', darkFirst: true });
    expect(prefersDark({ darkFirst: true })).toBe(true);
    localStorage.setItem('cms.theme', 'light');
    expect(prefersDark({ darkFirst: true })).toBe(false);
  });
});

describe('stored template, applied before React renders', () => {
  beforeEach(resetRoot);

  it('applies the last cached template', () => {
    cacheTemplate(tpl('green-garden'));
    applyStoredTemplate();
    expect(root.dataset.template).toBe('green-garden');
    expect(cssVar('--tpl-brand-600')).toBe('#0f766e');
  });

  it('a preview in this tab wins over the cached template, and dark-first turns on dark mode', () => {
    cacheTemplate(tpl('green-garden'));
    sessionStorage.setItem('cms.tpl.preview', JSON.stringify(tpl('night-sky', { darkFirst: true })));
    applyStoredTemplate();
    expect(root.dataset.template).toBe('night-sky');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('does nothing on a first visit', () => {
    expect(applyStoredTemplate()).toBeNull();
    expect(root.dataset.template).toBeUndefined();
  });
});

// TemplateProvider with the API and the signed-in user mocked.
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../api/client', () => ({ api }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { _id: 'u1', role: 'admin', society: { _id: 's1', name: 'Green Valley' } }, booting: false }) }));

describe('TemplateProvider', () => {
  beforeEach(() => {
    resetRoot();
    api.get.mockReset();
    api.put.mockReset();
    api.get.mockImplementation(async (path) => {
      if (path === '/appearance') return { template: tpl('classic-blue', { header: 'white' }), society: { code: 'DEMO01' }, logoUrl: null, coverUrl: null };
      if (path === '/appearance/preview/royal-maroon') return tpl('royal-maroon', { home: 'hero' });
      throw new Error(`unexpected ${path}`);
    });
  });
  afterEach(() => vi.clearAllMocks());

  async function mount() {
    const { TemplateProvider, useTemplate } = await import('../../context/TemplateContext');
    const ctx = {};
    function Probe() {
      Object.assign(ctx, useTemplate());
      return <p>{ctx.template.key}</p>;
    }
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TemplateProvider><Probe /></TemplateProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('classic-blue');
    return ctx;
  }

  it('applies the colony template from the API and caches it for the next visit', async () => {
    await mount();
    await waitFor(() => expect(root.dataset.template).toBe('classic-blue'));
    expect(JSON.parse(localStorage.getItem('cms.tpl.last')).key).toBe('classic-blue');
    expect(localStorage.getItem('cms.tpl.society')).toBe('DEMO01');
  });

  it('“Try it” applies a template in this tab only, and Cancel goes back without saving', async () => {
    const ctx = await mount();
    await act(() => ctx.startPreview('royal-maroon'));
    await screen.findByText('royal-maroon');
    expect(root.dataset.template).toBe('royal-maroon');
    expect(root.dataset.home).toBe('hero');
    expect(readPreview().key).toBe('royal-maroon');
    expect(JSON.parse(localStorage.getItem('cms.tpl.last')).key).toBe('classic-blue'); // not remembered as the colony's
    await act(() => ctx.cancelPreview());
    await screen.findByText('classic-blue');
    expect(root.dataset.template).toBe('classic-blue');
    expect(readPreview()).toBeNull();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('Apply saves the previewed template for the colony', async () => {
    api.put.mockResolvedValue({ template: tpl('royal-maroon'), society: { code: 'DEMO01' } });
    const ctx = await mount();
    await act(() => ctx.startPreview('royal-maroon'));
    await act(() => ctx.applyPreview());
    expect(api.put).toHaveBeenCalledWith('/appearance/template', { template: 'royal-maroon' });
    expect(readPreview()).toBeNull();
  });
});
