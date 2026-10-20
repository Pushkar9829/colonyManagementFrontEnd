import { beforeEach, describe, expect, it } from 'vitest';
import { adStore, bannerToShow, popupDue, safeUrl } from './lib';

const ad = (id, frequency = 'daily') => ({ _id: id, frequency });

describe('ad delivery helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('opens only https landing links', () => {
    expect(safeUrl('https://example.com/x')).toBe('https://example.com/x');
    expect(safeUrl('http://example.com')).toBeNull();
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
  });

  it('shows the first banner not closed in this visit', () => {
    const banners = [ad('a'), ad('b'), ad('c')];
    expect(bannerToShow(banners)._id).toBe('a');
    expect(bannerToShow(banners, new Set(['a']))._id).toBe('b');
    expect(bannerToShow(banners, new Set(['a', 'b', 'c']))).toBeNull();
    expect(bannerToShow(undefined)).toBeNull();
  });

  it('pop-up frequency: once, daily and every visit', () => {
    const today = '2026-10-21';
    expect(popupDue(null)).toBe(false);
    expect(popupDue(ad('o', 'once'), { seen: {} }, today)).toBe(true);
    expect(popupDue(ad('o', 'once'), { seen: { o: '2026-01-01' } }, today)).toBe(false);
    expect(popupDue(ad('d', 'daily'), { seen: { d: today } }, today)).toBe(false);
    expect(popupDue(ad('d', 'daily'), { seen: { d: '2026-10-20' } }, today)).toBe(true);
    expect(popupDue(ad('e', 'every_visit'), { seen: { e: today } }, today)).toBe(true);
    // never twice in the same visit, whatever the frequency
    expect(popupDue(ad('e', 'every_visit'), { seen: {}, shownThisVisit: new Set(['e']) }, today)).toBe(false);
  });

  it('remembers what was seen on this device and in this visit', () => {
    adStore.markSeen('x', '2026-10-21');
    adStore.markVisit('x');
    expect(adStore.seen()).toEqual({ x: '2026-10-21' });
    expect(adStore.visit().has('x')).toBe(true);
    expect(popupDue(ad('x', 'every_visit'), { seen: adStore.seen(), shownThisVisit: adStore.visit() })).toBe(false);
    sessionStorage.clear(); // a new visit
    expect(popupDue(ad('x', 'every_visit'), { seen: adStore.seen(), shownThisVisit: adStore.visit() })).toBe(true);
    expect(popupDue(ad('x', 'daily'), { seen: adStore.seen(), shownThisVisit: adStore.visit() }, '2026-10-21')).toBe(false);
  });
});
