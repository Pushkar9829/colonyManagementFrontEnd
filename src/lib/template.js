// Colony app templates (backend modules/appearance): applies a template to the page.
// Colours, fonts and corner radius become CSS variables on <html> (index.css maps Tailwind's brand / font /
// radius tokens onto them), the layout choices become data attributes (data-header, data-sidebar, data-home,
// data-login, data-buttons, data-icons, data-shadow) that AppLayout, AuthLayout, the dashboard and the shared
// Button / Card read. The last template is cached so the next visit paints in it before React starts.

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const RADII = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'button'];
const ATTRS = { header: 'header', sidebar: 'sidebar', home: 'home', login: 'login', buttons: 'buttons', icons: 'icons', shadow: 'shadow' };

const LAST_KEY = 'cms.tpl.last'; // the template last shown on this device
const SOCIETY_KEY = 'cms.tpl.society'; // society code last seen (login page asks for its look)
const PREVIEW_KEY = 'cms.tpl.preview'; // "Try it": this browser session only
const THEME_KEY = 'cms.theme';

// Classic Blue: what index.css shows with no variables set. Used for the platform console and as a fallback.
export const CLASSIC = Object.freeze({
  key: 'classic-blue',
  name: 'Classic Blue',
  darkFirst: false,
  header: 'white',
  sidebar: 'light',
  home: 'cards',
  login: 'split-photo',
  buttons: 'solid',
  icons: 'circle',
  shadow: 'soft',
});

const store = (kind) => {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};
const readJson = (kind, key) => {
  try {
    const raw = store(kind)?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeJson = (kind, key, value) => {
  try {
    if (value === null || value === undefined) store(kind)?.removeItem(key);
    else store(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the template still applies, it just is not remembered */
  }
};

export const readCached = () => readJson('local', LAST_KEY);
export const cacheTemplate = (template) => template?.key && writeJson('local', LAST_KEY, template);
export const readPreview = () => readJson('session', PREVIEW_KEY);
export const savePreview = (template) => writeJson('session', PREVIEW_KEY, template || null);
export const lastSocietyCode = () => {
  try {
    return store('local')?.getItem(SOCIETY_KEY) || null;
  } catch {
    return null;
  }
};
export const rememberSocietyCode = (code) => {
  try {
    if (code) store('local')?.setItem(SOCIETY_KEY, code);
  } catch {
    /* ignore */
  }
};

// Dark-first templates (Night Sky) start dark unless the person picked light / dark / system themselves.
export function prefersDark(template, win = window) {
  let saved = null;
  try {
    saved = win.localStorage.getItem(THEME_KEY);
  } catch {
    /* ignore */
  }
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  const system = win.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return system || (!saved && Boolean(template?.darkFirst));
}

export function applyTemplate(template, root = document.documentElement) {
  const t = template || CLASSIC;
  const style = root.style;
  const brand = t.palette?.brand;
  for (const s of SHADES) {
    if (brand?.[s]) style.setProperty(`--tpl-brand-${s}`, brand[s]);
    else style.removeProperty(`--tpl-brand-${s}`);
  }
  const colours = { accent: t.palette?.accent, 'success-surface': t.palette?.successSurface, 'warning-surface': t.palette?.warningSurface };
  for (const [name, value] of Object.entries(colours)) (value ? style.setProperty(`--tpl-${name}`, value) : style.removeProperty(`--tpl-${name}`));
  for (const r of RADII) (t.radii?.[r] ? style.setProperty(`--tpl-radius-${r}`, t.radii[r]) : style.removeProperty(`--tpl-radius-${r}`));
  (t.fonts?.body ? style.setProperty('--tpl-font-body', t.fonts.body) : style.removeProperty('--tpl-font-body'));
  (t.fonts?.heading ? style.setProperty('--tpl-font-heading', t.fonts.heading) : style.removeProperty('--tpl-font-heading'));
  for (const [field, attr] of Object.entries(ATTRS)) root.setAttribute(`data-${attr}`, t[field] || CLASSIC[field]);
  root.setAttribute('data-template', t.key || CLASSIC.key);
  root.setAttribute('data-dark-first', t.darkFirst ? 'true' : 'false');
  // The browser bar colour follows the brand.
  document.querySelector?.('meta[name="theme-color"]')?.setAttribute('content', root.classList.contains('dark') ? '#0f172a' : brand?.['600'] || '#4f46e5');
  root.dispatchEvent?.(new CustomEvent('cms:template', { detail: { key: t.key, darkFirst: Boolean(t.darkFirst) } }));
  return t;
}

// Called in main.jsx before React renders: the previewed template (this tab), else the last one shown.
export function applyStoredTemplate(root = document.documentElement) {
  const t = readPreview() || readCached();
  if (t) {
    applyTemplate(t, root);
    root.classList.toggle('dark', prefersDark(t));
  }
  return t;
}

// Background for an element with the .tpl-cover class: the colony's cover photo under a dark wash (so white
// text stays readable), or nothing — then .tpl-cover shows the generated gradient with rooftops.
export const coverStyle = (url) =>
  url
    ? { backgroundImage: `linear-gradient(180deg, rgb(0 0 0 / 0.38), rgb(0 0 0 / 0.62)), url("${String(url).replace(/["\\]/g, '')}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
