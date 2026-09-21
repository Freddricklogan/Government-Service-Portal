/** Schema-driven form validation with an ordered error summary, plus reference numbers with a check digit. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const POSTCODE = /^[A-Za-z0-9 -]{3,10}$/;

/**
 * A schema is [{ name, label, type, required?, min?, max?, pattern?, when?: (values) => boolean, maxLength? }].
 * Returns { valid, errors: [{ name, label, message }] } with errors in schema order — the order an error summary lists them.
 */
export function validate(schema, values) {
  const errors = [];
  for (const f of schema) {
    if (f.when && !f.when(values)) continue;
    const raw = values[f.name];
    const v = typeof raw === 'string' ? raw.trim() : raw;
    const empty = v === undefined || v === null || v === '' || v === false;
    if (f.required && empty) { errors.push({ name: f.name, label: f.label, message: f.requiredMessage ?? `Enter ${f.label.toLowerCase()}` }); continue; }
    if (empty) continue;
    if (f.type === 'email' && !EMAIL.test(v)) errors.push({ name: f.name, label: f.label, message: 'Enter an email address in the format name@example.com' });
    if (f.type === 'tel' && !PHONE.test(v)) errors.push({ name: f.name, label: f.label, message: 'Enter a telephone number using digits, spaces, brackets or dashes' });
    if (f.type === 'postcode' && !POSTCODE.test(v)) errors.push({ name: f.name, label: f.label, message: 'Enter a valid postal code' });
    if (f.type === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) errors.push({ name: f.name, label: f.label, message: `${f.label} must be a number` });
      else if (f.min !== undefined && n < f.min) errors.push({ name: f.name, label: f.label, message: `${f.label} must be ${f.min.toLocaleString()} or more` });
      else if (f.max !== undefined && n > f.max) errors.push({ name: f.name, label: f.label, message: `${f.label} must be ${f.max.toLocaleString()} or less` });
    }
    if (f.type === 'date') {
      // Date.parse('2026-02-30') rolls over to March in V8; a real date must survive a round trip.
      const t = Date.parse(v);
      const real = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
      if (!real) errors.push({ name: f.name, label: f.label, message: `${f.label} must be a real date` });
      else if (f.notBefore && v < f.notBefore) errors.push({ name: f.name, label: f.label, message: `${f.label} must be on or after ${f.notBefore}` });
      else if (f.notAfter && v > f.notAfter) errors.push({ name: f.name, label: f.label, message: `${f.label} must be on or before ${f.notAfter}` });
    }
    if (f.maxLength && String(v).length > f.maxLength) errors.push({ name: f.name, label: f.label, message: `${f.label} must be ${f.maxLength} characters or fewer` });
    if (f.pattern && !f.pattern.test(String(v))) errors.push({ name: f.name, label: f.label, message: f.patternMessage ?? `${f.label} is not in the expected format` });
  }
  return { valid: errors.length === 0, errors };
}

/** Luhn check digit over the digits of a string (letters are skipped). */
export function luhnCheckDigit(digits) {
  const ds = String(digits).replace(/\D/g, '').split('').map(Number);
  let sum = 0;
  for (let i = ds.length - 1, dbl = true; i >= 0; i -= 1, dbl = !dbl) {
    let d = ds[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

/** Reference like EC-2026-483920-7: prefix, year, six digits from the random source, Luhn check digit. */
export function makeReference(year, random = Math.random) {
  const six = String(Math.floor(random() * 1e6)).padStart(6, '0');
  const body = `${year}${six}`;
  return `EC-${year}-${six}-${luhnCheckDigit(body)}`;
}

export function parseReference(text) {
  const m = String(text).trim().toUpperCase().match(/^EC-(\d{4})-(\d{6})-(\d)$/);
  if (!m) return { valid: false, reason: 'Enter a reference in the format EC-YYYY-NNNNNN-C' };
  if (luhnCheckDigit(`${m[1]}${m[2]}`) !== Number(m[3])) return { valid: false, reason: 'That reference is not valid — check the digits and try again' };
  return { valid: true, reference: `EC-${m[1]}-${m[2]}-${m[3]}` };
}

/** Application status from timestamps: received → in review after 1 business day → decision at the expected date. */
export function statusFor(app, todayIso) {
  if (todayIso < app.submitted) return { stage: 'received', label: 'Received' };
  if (todayIso >= app.expectedDecision) return { stage: 'decision', label: 'Decision due — check your messages' };
  const inReview = app.submitted < todayIso;
  return inReview ? { stage: 'review', label: 'In review' } : { stage: 'received', label: 'Received' };
}
