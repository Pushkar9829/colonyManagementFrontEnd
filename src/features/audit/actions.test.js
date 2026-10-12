import { describe, expect, it } from 'vitest';
import { actionLabel, detailLines } from './actions';

describe('audit action labels', () => {
  it('uses written phrases for known codes', () => {
    expect(actionLabel('journal.opened')).toBe('Opened journal entry');
    expect(actionLabel('vendor_bill.created')).toBe('Added vendor bill');
  });
  it('humanises unknown codes', () => {
    expect(actionLabel('asset.created')).toBe('Added asset');
    expect(actionLabel('fire.drill_logged')).toBe('Fire: drill logged');
  });
  it('turns meta into readable lines', () => {
    const lines = detailLines({ number: 'VB-1', total: 120000, ok: true });
    expect(lines[0]).toEqual(['Number', 'VB-1']);
    expect(lines[1][1]).toMatch(/1,200/);
    expect(lines[2]).toEqual(['Ok', 'Yes']);
  });
});
