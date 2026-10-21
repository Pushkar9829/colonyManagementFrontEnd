import { afterEach, describe, expect, it } from 'vitest';
import { errorText, translateText } from './errorText';
import { date, setFormatLanguage, timeAgo } from './format';

const dict = {
  '{name} is only valid at {gates}': '{name} केवल {gates} पर मान्य हैं',
  'Pass is {status}': 'पास {status} है',
  'Payment Pending': 'भुगतान बाकी',
  'Unit not found': 'यूनिट नहीं मिला',
  'Enter at most {n} characters': 'अधिकतम {n} अक्षर लिखें',
  '{n}m ago': '{n} मिनट पहले',
};
const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`) : s);
const t = (s, v) => fill(dict[s] || s, v);
const en = (s, v) => fill(s, v);

describe('server messages', () => {
  it('translates a template with its params, and statuses inside it', () => {
    expect(errorText({ message: 'Raju is only valid at Main gate', template: '{name} is only valid at {gates}', params: { name: 'Raju', gates: 'Main gate' } }, t)).toBe('Raju केवल Main gate पर मान्य हैं');
    expect(errorText({ message: 'Pass is payment_pending', template: 'Pass is {status}', params: { status: 'payment_pending' } }, t)).toBe('पास भुगतान बाकी है');
  });

  it('falls back to the English message', () => {
    expect(errorText({ message: 'Something new', template: 'Something {x}', params: { x: 'new' } }, t)).toBe('Something new');
    expect(errorText({ message: 'Unit not found' }, t)).toBe('यूनिट नहीं मिला');
    expect(errorText(null, en)).toBe('Something went wrong');
  });

  it('maps schema messages only when the language has the friendlier text', () => {
    expect(translateText('Too big: expected string to have <=120 characters', t)).toBe('अधिकतम 120 अक्षर लिखें');
    expect(translateText('Too big: expected string to have <=120 characters', en)).toBe('Too big: expected string to have <=120 characters');
  });
});

describe('dates and durations follow the language', () => {
  afterEach(() => setFormatLanguage('en', null));

  it('stays English until a language is set', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60000))).toBe('5m ago');
    expect(date('2026-10-21T10:00:00')).toMatch(/Oct 2026/);
  });

  it('uses the chosen language with 0-9 digits', () => {
    setFormatLanguage('hi', dict);
    expect(timeAgo(new Date(Date.now() - 5 * 60000))).toBe('5 मिनट पहले');
    expect(date('2026-10-21T10:00:00')).toMatch(/21 .+ 2026/);
    expect(date('2026-10-21T10:00:00')).not.toMatch(/Oct/);
  });
});
