import { describe, expect, it } from 'vitest';
import { luhnCheckDigit, makeReference, parseReference, statusFor, validate } from '../src/forms.js';

const schema = [
  { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80 },
  { name: 'email', label: 'Email address', type: 'email', required: true },
  { name: 'phone', label: 'Telephone number', type: 'tel' },
  { name: 'postcode', label: 'Postal code', type: 'postcode', required: true },
  { name: 'cost', label: 'Estimated cost of work', type: 'number', required: true, min: 1, max: 5e7 },
  { name: 'start', label: 'Planned start date', type: 'date', required: true, notBefore: '2026-09-21' },
  { name: 'ownerBuilder', label: 'Owner-builder', type: 'checkbox' },
  { name: 'contractorLicence', label: 'Contractor licence number', type: 'text', required: true, when: (v) => !v.ownerBuilder, pattern: /^[A-Z]{2}\d{6}$/, patternMessage: 'Contractor licence numbers are two letters and six digits' },
  { name: 'terms', label: 'Declaration', type: 'checkbox', required: true, requiredMessage: 'Confirm the declaration' }
];

describe('validate', () => {
  it('reports required fields in schema order with government-style messages', () => {
    const r = validate(schema, {});
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.name)).toEqual(['fullName', 'email', 'postcode', 'cost', 'start', 'contractorLicence', 'terms']);
    expect(r.errors[0].message).toBe('Enter full name');
    expect(r.errors.at(-1).message).toBe('Confirm the declaration');
  });
  it('checks formats, ranges, dates, conditional fields and lengths', () => {
    const r = validate(schema, { fullName: 'x'.repeat(81), email: 'not-an-email', phone: 'abc', postcode: '!', cost: '0', start: '2026-02-30', ownerBuilder: false, contractorLicence: 'ab1', terms: true });
    expect(r.errors.map((e) => [e.name, e.message])).toEqual([
      ['fullName', 'Full name must be 80 characters or fewer'],
      ['email', 'Enter an email address in the format name@example.com'],
      ['phone', 'Enter a telephone number using digits, spaces, brackets or dashes'],
      ['postcode', 'Enter a valid postal code'],
      ['cost', 'Estimated cost of work must be 1 or more'],
      ['start', 'Planned start date must be a real date'],
      ['contractorLicence', 'Contractor licence numbers are two letters and six digits']
    ]);
    expect(validate(schema, { cost: 'abc' }).errors.find((e) => e.name === 'cost').message).toBe('Estimated cost of work must be a number');
    expect(validate(schema, { cost: 1e9 }).errors.find((e) => e.name === 'cost').message).toBe('Estimated cost of work must be 50,000,000 or less');
    expect(validate(schema, { start: '2026-01-01' }).errors.find((e) => e.name === 'start').message).toBe('Planned start date must be on or after 2026-09-21');
    expect(validate([{ name: 'd', label: 'D', type: 'date', notAfter: '2026-01-01' }], { d: '2026-05-05' }).errors[0].message).toBe('D must be on or before 2026-01-01');
  });
  it('accepts a complete application, with the conditional field skipped for owner-builders', () => {
    const ok = validate(schema, { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 (312) 555-0100', postcode: '60616', cost: '25000', start: '2026-10-01', ownerBuilder: true, terms: true });
    expect(ok).toEqual({ valid: true, errors: [] });
    const withContractor = validate(schema, { fullName: 'Ada', email: 'ada@example.com', postcode: '60616', cost: 25000, start: '2026-10-01', ownerBuilder: false, contractorLicence: 'IL123456', terms: true });
    expect(withContractor.valid).toBe(true);
  });
});

describe('references and status', () => {
  it('Luhn matches known values and round-trips references', () => {
    expect(luhnCheckDigit('7992739871')).toBe(3);
    expect(luhnCheckDigit('4539 1488 0343 646')).toBe(7);
    const ref = makeReference(2026, () => 0.483920);
    expect(ref).toMatch(/^EC-2026-483920-\d$/);
    expect(parseReference(ref.toLowerCase())).toEqual({ valid: true, reference: ref });
    expect(parseReference('EC-2026-483920-0').valid || parseReference('EC-2026-483920-1').valid).toBe(false);
    expect(parseReference('nonsense')).toMatchObject({ valid: false, reason: expect.stringMatching(/format/) });
    const wrong = ref.slice(0, -1) + ((Number(ref.at(-1)) + 1) % 10);
    expect(parseReference(wrong)).toMatchObject({ valid: false, reason: expect.stringMatching(/not valid/) });
    expect(makeReference(2026, () => 0)).toBe(`EC-2026-000000-${luhnCheckDigit('2026000000')}`);
  });
  it('derives a status from dates', () => {
    const app = { submitted: '2026-09-21', expectedDecision: '2026-10-05' };
    expect(statusFor(app, '2026-09-21')).toMatchObject({ stage: 'received' });
    expect(statusFor(app, '2026-09-22')).toMatchObject({ stage: 'review' });
    expect(statusFor(app, '2026-10-05')).toMatchObject({ stage: 'decision' });
    expect(statusFor(app, '2026-09-01')).toMatchObject({ stage: 'received' });
  });
});
