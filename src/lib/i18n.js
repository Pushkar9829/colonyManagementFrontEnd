// UI translations. Keys are the English strings used in the code; anything missing falls back to English.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

// Each language is downloaded only when someone picks it (English needs nothing). A language is split
// into parts: everyday screens, admin/accountant/manager screens, and the platform console + server messages.
const LOADERS = {
  hi: () => Promise.all([import('./i18n/hi.js'), import('./i18n/hi-admin.js'), import('./i18n/hi-platform.js')]),
  mr: () => Promise.all([import('./i18n/mr.js'), import('./i18n/mr-admin.js'), import('./i18n/mr-platform.js')]),
  pa: () => Promise.all([import('./i18n/pa.js'), import('./i18n/pa-admin.js'), import('./i18n/pa-platform.js')]),
};

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export async function loadDictionary(code) {
  const load = LOADERS[code];
  if (!load) return {};
  return Object.assign({}, ...(await load()).map((m) => m.default));
}
