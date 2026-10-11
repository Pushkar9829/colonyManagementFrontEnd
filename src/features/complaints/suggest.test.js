import { describe, expect, it } from 'vitest';
import { suggestCategory } from './suggest';

const cats = [
  { key: 'plumbing', name: 'Plumbing', keywords: ['tap', 'leak', 'leaking'] },
  { key: 'electrical', name: 'Electrical', keywords: ['light', 'short circuit'] },
  { key: 'pest_control', name: 'Pest Control', keywords: ['termite', 'termites'] },
];

describe('suggestCategory', () => {
  it('picks the category with the most keyword matches', () => {
    expect(suggestCategory('Kitchen tap leaking', cats).key).toBe('plumbing');
    expect(suggestCategory('Termites in the cupboard', cats).key).toBe('pest_control');
  });
  it('matches phrases and whole words only', () => {
    expect(suggestCategory('Short circuit near meter', cats).key).toBe('electrical');
    expect(suggestCategory('Delightful evening', cats)).toBeNull();
  });
});
