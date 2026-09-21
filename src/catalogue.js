/** Service catalogue: validation, ranked search, and fee arithmetic from the rules in data/services.json. */

const FEE_TYPES = new Set(['flat', 'perUnit', 'tiered']);

export function validateCatalogue(cat) {
  const p = [];
  if (!Array.isArray(cat?.services) || cat.services.length === 0) return ['catalogue needs services'];
  const ids = new Set();
  for (const s of cat.services) {
    const w = `service "${s.id ?? '?'}"`;
    if (!s.id) p.push('service needs an id');
    if (ids.has(s.id)) p.push(`${w}: duplicate id`);
    ids.add(s.id);
    if (!s.name || !s.category || !s.summary) p.push(`${w}: needs name, category and summary`);
    if (!cat.categories?.includes(s.category)) p.push(`${w}: unknown category "${s.category}"`);
    if (!FEE_TYPES.has(s.fee?.type)) p.push(`${w}: unknown fee type "${s.fee?.type}"`);
    if (s.fee?.type === 'flat' && !(s.fee.amount >= 0)) p.push(`${w}: flat fee needs amount >= 0`);
    if (s.fee?.type === 'perUnit' && !(s.fee.rate > 0 && s.fee.basis)) p.push(`${w}: perUnit fee needs rate > 0 and basis`);
    if (s.fee?.type === 'tiered' && !(Array.isArray(s.fee.tiers) && s.fee.tiers.length && s.fee.basis)) p.push(`${w}: tiered fee needs tiers and basis`);
    if (!(Number.isInteger(s.processingDays) && s.processingDays >= 0)) p.push(`${w}: processingDays must be a non-negative integer`);
    if (!Array.isArray(s.requires)) p.push(`${w}: requires must be a list`);
  }
  return p;
}

const tokens = (s) => s.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);

/**
 * Ranked search: name matches outrank keyword matches outrank category and summary matches; every query
 * token must match somewhere. Returns [{ service, score }] sorted by score then name.
 */
export function search(services, query, { limit = 8 } = {}) {
  const q = tokens(query);
  if (q.length === 0 || query.trim().length < 2) return [];
  const out = [];
  for (const s of services) {
    const name = tokens(s.name);
    const kw = (s.keywords ?? []).flatMap(tokens);
    const cat = tokens(s.category);
    const sum = tokens(s.summary);
    let score = 0;
    let all = true;
    for (const t of q) {
      let best = 0;
      if (name.some((n) => n === t)) best = 10;
      else if (name.some((n) => n.startsWith(t))) best = 6;
      else if (kw.some((k) => k === t || k.startsWith(t))) best = 5;
      else if (cat.some((c) => c.startsWith(t))) best = 3;
      else if (sum.some((w) => w.startsWith(t))) best = 1;
      if (best === 0) { all = false; break; }
      score += best;
    }
    if (all) out.push({ service: s, score });
  }
  return out.sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name)).slice(0, limit);
}

export function byCategory(services, category) {
  return services.filter((s) => s.category === category);
}

/** Computes a fee from the service's rule and the relevant quantity; returns { amount, basis, explanation }. */
export function computeFee(service, quantity = 0) {
  const f = service.fee;
  if (f.type === 'flat') return { amount: f.amount, basis: null, explanation: f.amount === 0 ? 'No fee' : `Flat fee $${f.amount}` };
  if (f.type === 'perUnit') {
    const q = Math.max(0, Number(quantity) || 0);
    const raw = q * f.rate;
    const amount = Math.max(f.minimum ?? 0, raw);
    const min = amount > raw ? ` (minimum $${f.minimum})` : '';
    const explanation = f.basis === 'estimatedCost' ? `${(f.rate * 100).toFixed(1)}% of $${q.toLocaleString()} estimated cost${min}` : `${q.toLocaleString()} ${BASIS_LABEL[f.basis] ?? f.basis} × $${f.rate}${min}`;
    return { amount: round2(amount), basis: f.basis, explanation };
  }
  const q = Math.max(0, Number(quantity) || 0);
  let tier = f.tiers[0];
  for (const t of f.tiers) if (q >= t[0]) tier = t;
  return { amount: tier[1], basis: f.basis, explanation: `${q.toLocaleString()} ${BASIS_LABEL[f.basis] ?? f.basis} → tier from ${tier[0]}: $${tier[1]}` };
}

const round2 = (n) => Math.round(n * 100) / 100;
const BASIS_LABEL = { attendees: 'attendees', copies: 'copies', pages: 'pages', employees: 'employees' };

/** Expected decision date: processing days counted as business days from the submission date. */
export function expectedDecision(service, submittedIso) {
  const d = new Date(submittedIso);
  let remaining = service.processingDays;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return d.toISOString().slice(0, 10);
}
