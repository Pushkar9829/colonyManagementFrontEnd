// UI translations. Keys are the English strings used in the code; anything missing falls back to English.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

// Each language is a separate chunk, downloaded only when someone picks it (English needs nothing).
const LOADERS = {
  hi: () => import('./i18n/hi.js'),
  mr: () => import('./i18n/mr.js'),
  pa: () => import('./i18n/pa.js'),
};

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export async function loadDictionary(code) {
  const load = LOADERS[code];
  return load ? (await load()).default : {};
}
