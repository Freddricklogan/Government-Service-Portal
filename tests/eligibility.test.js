import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { incomeLimit, prescreen, validateAnswers } from '../src/eligibility.js';

const P = JSON.parse(readFileSync(new URL('../data/services.json', import.meta.url), 'utf8')).prescreen.programmes;

describe('pre-screener', () => {
  it('validates answers', () => {
    expect(validateAnswers({ householdSize: 2, monthlyIncome: 1500, resident: true })).toEqual([]);
    expect(validateAnswers({ householdSize: 0, monthlyIncome: -1, resident: 'yes', monthlyRent: -5 })).toEqual(['Household size must be a whole number from 1 to 20', 'Monthly income must be 0 or more', 'Say whether you live in the city', 'Monthly rent must be 0 or more']);
  });
  it('extends the income table beyond its last row', () => {
    expect(incomeLimit(P[0], 1)).toBe(1600);
    expect(incomeLimit(P[0], 6)).toBe(4600);
    expect(incomeLimit(P[0], 8)).toBe(4600 + 2 * 600);
  });
  it('screens each programme with reasons, and never claims more than "likely"', () => {
    const r = prescreen(P, { householdSize: 3, monthlyIncome: 2500, resident: true, monthlyRent: 900 });
    expect(r.map((x) => [x.id, x.likely])).toEqual([['food-assistance', true], ['housing-assistance', true], ['healthcare-enrolment', true]]);
    const high = prescreen(P, { householdSize: 1, monthlyIncome: 5000, resident: false, monthlyRent: 500 });
    expect(high.every((x) => !x.likely)).toBe(true);
    expect(high[0].reasons).toEqual(['Monthly income $5,000 is above the $1,600 limit for a household of 1', 'Applicants must live in the city']);
    expect(high[1].reasons[2]).toMatch(/Rent is 10% of income; the programme requires at least 30%/);
    const noRent = prescreen(P, { householdSize: 2, monthlyIncome: 2000, resident: true });
    expect(noRent[1].reasons).toEqual(['Rent amount needed to check rent burden']);
    expect(noRent[0].likely).toBe(true);
    const zeroIncome = prescreen(P, { householdSize: 1, monthlyIncome: 0, resident: true, monthlyRent: 0 });
    expect(zeroIncome[1].likely).toBe(true);
  });
});
