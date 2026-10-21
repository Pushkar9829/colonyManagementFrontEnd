import { label } from './format';

// Server messages arrive in English. Messages with dynamic parts also carry a `template`
// ('{name} is only valid at {gates}') and `params`, which are translated here like any other text.
// Validation messages from the server's schema library have fixed shapes; they are matched to
// friendlier templates, but only when the chosen language has that template (English stays as sent).
const PATTERNS = [
  [/^Too small: expected string to have >=1 characters?$/, () => ['Required']],
  [/^Too small: expected string to have >=(\d+) characters?$/, (m) => ['Enter at least {n} characters', { n: m[1] }]],
  [/^Too big: expected string to have <=(\d+) characters?$/, (m) => ['Enter at most {n} characters', { n: m[1] }]],
  [/^Too small: expected number to be >=(-?[\d.]+)$/, (m) => ['Must be at least {n}', { n: m[1] }]],
  [/^Too small: expected number to be >(-?[\d.]+)$/, (m) => ['Must be more than {n}', { n: m[1] }]],
  [/^Too big: expected number to be <=(-?[\d.]+)$/, (m) => ['Must be at most {n}', { n: m[1] }]],
  [/^Too big: expected number to be <(-?[\d.]+)$/, (m) => ['Must be less than {n}', { n: m[1] }]],
  [/^Too small: expected array to have >=(\d+) items?$/, (m) => ['Choose at least {n}', { n: m[1] }]],
  [/^Too big: expected array to have <=(\d+) items?$/, (m) => ['Choose at most {n}', { n: m[1] }]],
  [/^Invalid input: expected \w+, received undefined$/, () => ['Required']],
  [/^Invalid input: expected int, received number$/, () => ['Enter a whole number']],
  [/^Invalid input: expected number, received \w+$/, () => ['Enter a number']],
  [/^Invalid input: expected .+$/, () => ['Invalid value']],
  [/^Invalid option: expected one of .+$/, () => ['Choose one of the options']],
  [/^Invalid string: must match pattern .+$/, () => ['Invalid format']],
  [/^Request failed \((\d+)\)$/, (m) => ['Request failed ({status})', { status: m[1] }]],
  [/^Upload failed \((\d+)\)$/, (m) => ['Upload failed ({status})', { status: m[1] }]],
  [/^Download failed \((\d+)\)$/, (m) => ['Download failed ({status})', { status: m[1] }]],
];

const has = (t, text) => t(text) !== text;

// A param value such as a status ('checked_out') or a reason sentence: translated when the
// dictionary knows it, otherwise shown as sent (names, numbers, codes).
function param(v, t) {
  if (typeof v !== 'string' || !v) return v;
  if (has(t, v)) return t(v);
  const l = label(v);
  return has(t, l) ? t(l) : v;
}

export function translateParams(params, t) {
  if (!params) return params;
  const out = {};
  for (const [k, v] of Object.entries(params)) out[k] = param(v, t);
  return out;
}

// One plain English message → the user's language (falls back to the English text).
export function translateText(text, t) {
  if (typeof text !== 'string' || !text) return text;
  if (has(t, text)) return t(text);
  for (const [re, make] of PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const [template, vars] = make(m);
    return has(t, template) ? t(template, vars) : text;
  }
  return text;
}

// What to show for an error (an ApiError from api/client, any Error, or a string).
export function errorText(err, t, fallback = 'Something went wrong') {
  if (!err) return t(fallback);
  if (typeof err === 'string') return translateText(err, t);
  if (err.template && has(t, err.template)) return t(err.template, translateParams(err.params, t));
  return translateText(err.message || fallback, t);
}
