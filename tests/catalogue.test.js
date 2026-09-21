import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { byCategory, computeFee, expectedDecision, search, validateCatalogue } from '../src/catalogue.js';

const cat = JSON.parse(readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'));
const S = cat.services;
const by = (id) => S.find((s) => s.id === id);

describe('catalogue', () => {
  it('ships 24 valid services across 6 categories and names problems in a broken one', () => {
    expect(S).toHaveLength(24);
    expect(validateCatalogue(cat)).toEqual([]);
    expect(cat.categories).toHaveLength(6);
    const bad = { categories: ['A'], services: [{ id: 'x', name: 'X', category: 'B', summary: 's', fee: { type: 'magic' }, processingDays: -1, requires: 'no' }, { id: 'x', name: '', category: 'A', summary: '', fee: { type: 'perUnit', rate: 0 }, processingDays: 2, requires: [] }] };
    expect(validateCatalogue(bad)).toEqual(expect.arrayContaining(['service "x": unknown category "B"', 'service "x": unknown fee type "magic"', 'service "x": processingDays must be a non-negative integer', 'service "x": requires must be a list', 'service "x": duplicate id', 'service "x": needs name, category and summary', 'service "x": perUnit fee needs rate > 0 and basis']));
    expect(validateCatalogue({})).toEqual(['catalogue needs services']);
  });
});

describe('search', () => {
  it('ranks name matches above keyword and category matches and requires every token', () => {
    const r = search(S, 'permit');
    expect(r[0].service.category).toBe('Permits');
    expect(r.map((x) => x.service.id)).toContain('building-permit');
    expect(search(S, 'building permit')[0].service.id).toBe('building-permit');
    expect(search(S, 'snap')[0].service.id).toBe('food-assistance'); // keyword
    expect(search(S, 'deck')[0].service.id).toBe('building-permit'); // keyword
    expect(search(S, 'water')[0].service.id).toBe('utility-payment');
    expect(search(S, 'permit unicorn')).toEqual([]);
    expect(search(S, 'p')).toEqual([]);
    expect(search(S, '   ')).toEqual([]);
    expect(search(S, 'pay', { limit: 2 })).toHaveLength(2);
    expect(search(S, 'pay').length).toBeGreaterThan(2);
  });
  it('filters by category', () => {
    expect(byCategory(S, 'Records')).toHaveLength(5);
    expect(byCategory(S, 'Nope')).toEqual([]);
  });
});

describe('fees and dates', () => {
  it('computes flat, per-unit with minimum, and tiered fees', () => {
    expect(computeFee(by('drivers-licence-renewal'))).toMatchObject({ amount: 30, explanation: 'Flat fee $30' });
    expect(computeFee(by('tax-payment'))).toMatchObject({ amount: 0, explanation: 'No fee' });
    expect(computeFee(by('building-permit'), 100000)).toMatchObject({ amount: 1200, basis: 'estimatedCost' });
    expect(computeFee(by('building-permit'), 1000)).toMatchObject({ amount: 75 });
    expect(computeFee(by('building-permit'), 1000).explanation).toBe('1.2% of $1,000 estimated cost (minimum $75)');
    expect(computeFee(by('birth-certificate'), 3).explanation).toBe('3 copies × $15');
    expect(computeFee(by('birth-certificate'), 3).amount).toBe(45);
    expect(computeFee(by('birth-certificate'), -2).amount).toBe(15);
    expect(computeFee(by('business-licence-renewal'), 0).amount).toBe(50);
    expect(computeFee(by('business-licence-renewal'), 10).amount).toBe(150);
    expect(computeFee(by('business-licence-renewal'), 500).amount).toBe(400);
    expect(computeFee(by('special-event-permit'), 'abc').amount).toBe(50);
  });
  it('counts processing days as business days', () => {
    expect(expectedDecision(by('birth-certificate'), '2026-09-18')).toBe('2026-09-29'); // Fri + 7 business days
    expect(expectedDecision(by('tax-payment'), '2026-09-19')).toBe('2026-09-21'); // Sat + 1 → Mon
    expect(expectedDecision(by('help-centre'), '2026-09-21')).toBe('2026-09-21');
    expect(expectedDecision(by('building-permit'), '2026-09-21')).toBe('2026-11-02');
  });
});
