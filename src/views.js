/** DOM views for the portal. Logic lives in catalogue.js, forms.js and eligibility.js. */
import { byCategory, computeFee, expectedDecision, search } from './catalogue.js';
import { prescreen, validateAnswers } from './eligibility.js';
import { makeReference, parseReference, statusFor, validate } from './forms.js';
import { el } from './ui.js';

const KEY = 'gsp-prototype-v1';
export const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? { draft: null, applications: [] }; } catch { return { draft: null, applications: [] }; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* keep working in memory */ } }
};
const today = () => new Date().toISOString().slice(0, 10);
const usd = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const nav = (hash) => { window.location.hash = hash; };

function h1(text) { return el('h1', { class: 'page-title', text }); }
function focusMain(root) { root.setAttribute('tabindex', '-1'); root.focus(); }

// ---------- Home ----------
export function renderHome(root, cat) {
  root.replaceChildren();
  const input = el('input', { type: 'search', id: 'q', autocomplete: 'off', 'aria-describedby': 'q-help', placeholder: 'e.g. building permit, birth certificate, SNAP' });
  const results = el('ul', { class: 'results', id: 'results', 'aria-label': 'Search results' });
  const help = el('p', { class: 'meta', id: 'q-help', text: `Search ${cat.services.length} services by name, keyword or category.` });
  const status = el('p', { class: 'meta', 'aria-live': 'polite' });
  const run = () => {
    const r = search(cat.services, input.value);
    results.replaceChildren(...r.map(({ service }) => {
      const b = el('button', { type: 'button', class: 'result' });
      b.append(el('strong', { text: service.name }), el('span', { class: 'meta', text: ` ${service.category} · ${service.online ? 'online' : 'in person'}` }));
      b.addEventListener('click', () => nav(`#/service/${service.id}`));
      return el('li', {}, [b]);
    }));
    status.textContent = input.value.trim().length < 2 ? '' : `${r.length} result${r.length === 1 ? '' : 's'}`;
  };
  input.addEventListener('input', run);
  root.append(
    h1('Find a service'),
    el('div', { class: 'field' }, [el('label', { for: 'q', text: 'What do you need to do?' }), input, help]),
    status, results,
    el('h2', { text: 'Browse by category' }),
    el('div', { class: 'cat-grid' }, cat.categories.map((c) => {
      const list = byCategory(cat.services, c);
      const card = el('section', { class: 'cat-card', 'aria-labelledby': `cat-${c}` });
      card.append(el('h3', { id: `cat-${c}`, text: c }), el('ul', {}, list.map((s) => { const a = el('a', { href: `#/service/${s.id}`, text: s.name }); return el('li', {}, [a]); })));
      return card;
    })),
    el('h2', { text: 'Tasks' }),
    el('div', { class: 'button-row' }, [
      el('a', { class: 'btn btn--primary', href: '#/apply', text: 'Apply for a building permit' }),
      el('a', { class: 'btn', href: '#/status', text: 'Check application status' }),
      el('a', { class: 'btn', href: '#/prescreen', text: 'Benefits pre-screener' })
    ])
  );
  focusMain(root);
}

// ---------- Service detail ----------
export function renderService(root, cat, id) {
  const s = cat.services.find((x) => x.id === id);
  root.replaceChildren();
  if (!s) { root.append(h1('Service not found'), el('a', { href: '#/', text: 'Back to all services' })); focusMain(root); return; }
  root.append(el('a', { href: '#/', class: 'back', text: '← All services' }), h1(s.name), el('p', { class: 'meta', text: `${s.category} · ${s.online ? 'Available online' : 'In person only'} · typical processing ${s.processingDays} business day${s.processingDays === 1 ? '' : 's'}` }), el('p', { text: s.summary }));
  if (s.requires.length) root.append(el('h2', { text: 'What you will need' }), el('ul', {}, s.requires.map((r) => el('li', { text: r }))));
  const feeOut = el('p', { class: 'fee', 'aria-live': 'polite' });
  if (s.fee.type === 'flat') feeOut.textContent = computeFee(s).explanation;
  else {
    const qty = el('input', { type: 'number', id: 'qty', min: '0', step: s.fee.basis === 'estimatedCost' ? '100' : '1', value: s.fee.basis === 'estimatedCost' ? '25000' : '1' });
    const label = { estimatedCost: 'Estimated cost of work (USD)', attendees: 'Expected attendance', copies: 'Number of copies', pages: 'Number of pages', employees: 'Number of employees' }[s.fee.basis] ?? s.fee.basis;
    const upd = () => { const f = computeFee(s, qty.value); feeOut.textContent = `Fee ${usd(f.amount)} — ${f.explanation}`; };
    qty.addEventListener('input', upd);
    root.append(el('h2', { text: 'Fee' }), el('div', { class: 'field field--narrow' }, [el('label', { for: 'qty', text: label }), qty]));
    upd();
  }
  root.append(feeOut, el('p', { class: 'meta', text: `If submitted today, a decision would be expected by ${expectedDecision(s, today())} (business days).` }));
  if (s.id === 'building-permit') root.append(el('a', { class: 'btn btn--primary', href: '#/apply', text: 'Start application' }));
  else root.append(el('p', { class: 'notice', text: `Prototype: the online form for this service is not built. The building permit application demonstrates the full flow.` }));
  focusMain(root);
}

// ---------- Building permit application ----------
const STEPS = [
  { id: 'applicant', title: 'About you', fields: [
    { name: 'fullName', label: 'Full name', type: 'text', required: true, maxLength: 80, autocomplete: 'name' },
    { name: 'email', label: 'Email address', type: 'email', required: true, autocomplete: 'email', hint: 'We will send the reference number here.' },
    { name: 'phone', label: 'Telephone number', type: 'tel', autocomplete: 'tel', hint: 'Optional.' },
    { name: 'postcode', label: 'Postal code of the property', type: 'postcode', required: true, autocomplete: 'postal-code' }
  ] },
  { id: 'project', title: 'About the work', fields: [
    { name: 'description', label: 'Description of the work', type: 'textarea', required: true, maxLength: 500, hint: 'What you are building or changing, in plain language.' },
    { name: 'cost', label: 'Estimated cost of work (USD)', type: 'number', required: true, min: 1, max: 5e7, inputmode: 'numeric' },
    { name: 'start', label: 'Planned start date', type: 'date', required: true, notBefore: today(), hint: 'Must be today or later.' },
    { name: 'ownerBuilder', label: 'I am the owner and will do the work myself', type: 'checkbox' },
    { name: 'contractorLicence', label: 'Contractor licence number', type: 'text', required: true, when: (v) => !v.ownerBuilder, pattern: /^[A-Z]{2}\d{6}$/, patternMessage: 'Contractor licence numbers are two letters and six digits, for example IL123456', hint: 'Two letters and six digits.' }
  ] },
  { id: 'declare', title: 'Declaration', fields: [
    { name: 'terms', label: 'The information I have given is true and I understand that work must not start before the permit is issued', type: 'checkbox', required: true, requiredMessage: 'Confirm the declaration' }
  ] }
];

export function renderApply(root, cat, stepIndex, random = Math.random) {
  const service = cat.services.find((s) => s.id === 'building-permit');
  const data = store.get();
  const values = data.draft?.values ?? {};
  root.replaceChildren();
  if (stepIndex === 'review') return renderReview(root, cat, service, values, random);
  const step = STEPS[stepIndex] ?? STEPS[0];
  const i = STEPS.indexOf(step);
  root.append(el('a', { href: '#/service/building-permit', class: 'back', text: '← Building permit' }), el('p', { class: 'meta', text: `Step ${i + 1} of ${STEPS.length + 1}` }), h1(step.title));
  const summary = el('div', { class: 'error-summary', role: 'alert', tabindex: '-1', hidden: '' });
  const form = el('form', { novalidate: '' });
  const inputs = {};
  for (const f of step.fields) {
    const id = `f-${f.name}`;
    const hintId = f.hint ? `${id}-hint` : null;
    const errId = `${id}-error`;
    let input;
    if (f.type === 'textarea') input = el('textarea', { id, name: f.name, rows: '4', maxlength: String(f.maxLength ?? 500) });
    else if (f.type === 'checkbox') input = el('input', { id, name: f.name, type: 'checkbox' });
    else input = el('input', { id, name: f.name, type: f.type === 'postcode' ? 'text' : f.type === 'tel' ? 'tel' : f.type, ...(f.autocomplete ? { autocomplete: f.autocomplete } : {}), ...(f.inputmode ? { inputmode: f.inputmode } : {}), ...(f.type === 'date' ? { min: f.notBefore } : {}) });
    if (f.type === 'checkbox') input.checked = Boolean(values[f.name]); else input.value = values[f.name] ?? '';
    input.setAttribute('aria-describedby', [hintId, errId].filter(Boolean).join(' '));
    inputs[f.name] = input;
    const err = el('p', { class: 'field-error', id: errId, hidden: '' });
    const wrap = el('div', { class: `field ${f.type === 'checkbox' ? 'field--check' : ''}`, id: `w-${f.name}` });
    if (f.type === 'checkbox') wrap.append(el('div', { class: 'check' }, [input, el('label', { for: id, text: f.label })]), err);
    else wrap.append(el('label', { for: id, text: f.label }), ...(f.hint ? [el('p', { class: 'hint', id: hintId, text: f.hint })] : []), input, err);
    form.append(wrap);
    if (f.when) {
      const toggle = () => { wrap.hidden = !f.when(collect()); };
      inputs.ownerBuilder?.addEventListener('change', toggle);
      queueMicrotask(toggle);
    }
  }
  const collect = () => { const v = { ...values }; for (const f of step.fields) v[f.name] = f.type === 'checkbox' ? inputs[f.name].checked : inputs[f.name].value; return v; };
  const actions = el('div', { class: 'button-row' });
  const next = el('button', { type: 'submit', class: 'btn btn--primary', text: i === STEPS.length - 1 ? 'Continue to review' : 'Continue' });
  const save = el('button', { type: 'button', class: 'btn', text: 'Save and come back later' });
  actions.append(next, save);
  if (i > 0) actions.append(el('a', { class: 'btn', href: `#/apply/${i - 1}`, text: 'Back' }));
  form.append(actions);
  const saveDraft = (v) => store.set({ ...store.get(), draft: { values: v, savedAt: new Date().toISOString(), step: i } });
  save.addEventListener('click', () => { saveDraft(collect()); status.textContent = 'Saved in this browser. Return to this page to continue.'; });
  const status = el('p', { class: 'meta', 'aria-live': 'polite' });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = collect();
    const r = validate(step.fields, v);
    for (const f of step.fields) { inputs[f.name].removeAttribute('aria-invalid'); const errEl = root.querySelector(`#f-${f.name}-error`); errEl.hidden = true; errEl.textContent = ''; root.querySelector(`#w-${f.name}`).classList.remove('has-error'); }
    if (!r.valid) {
      summary.replaceChildren(el('h2', { text: 'There is a problem' }), el('ul', {}, r.errors.map((err) => { const a = el('a', { href: `#f-${err.name}`, text: err.message }); a.addEventListener('click', (ev) => { ev.preventDefault(); inputs[err.name].focus(); }); return el('li', {}, [a]); })));
      summary.hidden = false;
      for (const err of r.errors) { inputs[err.name].setAttribute('aria-invalid', 'true'); const errEl = root.querySelector(`#f-${err.name}-error`); errEl.textContent = `Error: ${err.message}`; errEl.hidden = false; root.querySelector(`#w-${err.name}`).classList.add('has-error'); }
      summary.focus();
      return;
    }
    saveDraft(v);
    nav(i === STEPS.length - 1 ? '#/apply/review' : `#/apply/${i + 1}`);
  });
  root.append(summary, form, status);
  if (data.draft?.savedAt && i === 0) status.textContent = `Draft restored from ${data.draft.savedAt.slice(0, 16).replace('T', ' ')}.`;
  focusMain(root);
  return undefined;
}

function renderReview(root, cat, service, values, random) {
  const all = STEPS.flatMap((s) => s.fields);
  const r = validate(all, values);
  root.append(el('p', { class: 'meta', text: `Step ${STEPS.length + 1} of ${STEPS.length + 1}` }), h1('Check your answers'));
  if (!r.valid) { root.append(el('p', { class: 'notice', text: 'Some answers are missing or invalid. Go back and complete each step.' }), el('a', { class: 'btn', href: '#/apply/0', text: 'Start again' })); focusMain(root); return; }
  const fee = computeFee(service, values.cost);
  const dl = el('dl', { class: 'review' });
  for (const s of STEPS) for (const f of s.fields) {
    if (f.when && !f.when(values)) continue;
    const v = values[f.name];
    dl.append(el('dt', { text: f.label }), el('dd', {}, [el('span', { text: f.type === 'checkbox' ? (v ? 'Yes' : 'No') : String(v || '—') }), el('a', { href: `#/apply/${STEPS.indexOf(s)}`, class: 'change', text: 'Change', 'aria-label': `Change ${f.label.toLowerCase()}` })]));
  }
  dl.append(el('dt', { text: 'Fee' }), el('dd', { text: `${usd(fee.amount)} — ${fee.explanation}` }));
  const submit = el('button', { type: 'button', class: 'btn btn--primary', text: 'Submit application' });
  submit.addEventListener('click', () => {
    const submitted = today();
    const app = { reference: makeReference(Number(submitted.slice(0, 4)), random), service: service.id, submitted, expectedDecision: expectedDecision(service, submitted), fee: fee.amount, values };
    const data = store.get();
    store.set({ draft: null, applications: [...data.applications, app] });
    nav(`#/done/${app.reference}`);
  });
  root.append(dl, el('p', { class: 'meta', text: `Expected decision by ${expectedDecision(service, today())} (${service.processingDays} business days). Nothing is sent anywhere: this prototype stores the application in your browser only.` }), el('div', { class: 'button-row' }, [submit, el('a', { class: 'btn', href: `#/apply/${STEPS.length - 1}`, text: 'Back' })]));
  focusMain(root);
}

export function renderDone(root, reference) {
  const app = store.get().applications.find((a) => a.reference === reference);
  root.replaceChildren();
  if (!app) { root.append(h1('Application not found'), el('a', { href: '#/', text: 'Home' })); focusMain(root); return; }
  root.append(el('div', { class: 'confirm', role: 'status' }, [el('h1', { class: 'page-title', text: 'Application submitted' }), el('p', { text: 'Your reference number' }), el('p', { class: 'ref', text: app.reference })]),
    el('p', { text: `We would email a copy to ${app.values.email}. Expected decision by ${app.expectedDecision}. Fee due: ${usd(app.fee)}.` }),
    el('h2', { text: 'What happens next' }), el('ol', {}, [el('li', { text: 'A reviewer checks the drawings and site plan.' }), el('li', { text: 'You may be asked for more information; the reference number identifies your file.' }), el('li', { text: 'The decision is issued by the expected date; work must not start before then.' })]),
    el('div', { class: 'button-row' }, [el('a', { class: 'btn', href: '#/status', text: 'Check status' }), el('a', { class: 'btn', href: '#/', text: 'Home' })]));
  focusMain(root);
}

// ---------- Status ----------
export function renderStatus(root) {
  root.replaceChildren();
  const input = el('input', { type: 'text', id: 'ref', autocomplete: 'off', placeholder: 'EC-2026-000000-0', 'aria-describedby': 'ref-hint ref-error' });
  const err = el('p', { class: 'field-error', id: 'ref-error', hidden: '' });
  const out = el('div', { class: 'status-out', 'aria-live': 'polite' });
  const form = el('form', { novalidate: '' });
  form.append(el('div', { class: 'field field--narrow' }, [el('label', { for: 'ref', text: 'Reference number' }), el('p', { class: 'hint', id: 'ref-hint', text: 'From your confirmation, in the format EC-YYYY-NNNNNN-C.' }), input, err]), el('button', { type: 'submit', class: 'btn btn--primary', text: 'Check status' }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    err.hidden = true; input.removeAttribute('aria-invalid'); out.replaceChildren();
    const p = parseReference(input.value);
    if (!p.valid) { err.textContent = `Error: ${p.reason}`; err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    const app = store.get().applications.find((a) => a.reference === p.reference);
    if (!app) { out.append(el('p', { class: 'notice', text: `No application with reference ${p.reference} is stored in this browser. This prototype keeps applications locally, so a reference from another device will not be found.` })); return; }
    const st = statusFor(app, today());
    out.append(el('h2', { text: app.reference }), el('p', { class: `stage stage-${st.stage}`, text: st.label }), el('p', { text: `Building permit · submitted ${app.submitted} · expected decision ${app.expectedDecision} · fee ${usd(app.fee)}` }));
  });
  const apps = store.get().applications;
  root.append(h1('Check application status'), form, out);
  if (apps.length) root.append(el('h2', { text: 'Applications in this browser' }), el('ul', {}, apps.map((a) => el('li', { text: `${a.reference} · submitted ${a.submitted} · ${statusFor(a, today()).label}` }))));
  focusMain(root);
}

// ---------- Pre-screener ----------
export function renderPrescreen(root, cat) {
  root.replaceChildren();
  const size = el('input', { type: 'number', id: 'hh', min: '1', max: '20', step: '1', value: '1', inputmode: 'numeric' });
  const income = el('input', { type: 'number', id: 'inc', min: '0', step: '1', inputmode: 'numeric', value: '' });
  const rent = el('input', { type: 'number', id: 'rent', min: '0', step: '1', inputmode: 'numeric', value: '' });
  const resYes = el('input', { type: 'radio', name: 'res', id: 'res-yes', value: 'yes' });
  const resNo = el('input', { type: 'radio', name: 'res', id: 'res-no', value: 'no' });
  const summary = el('div', { class: 'error-summary', role: 'alert', tabindex: '-1', hidden: '' });
  const out = el('div', { 'aria-live': 'polite' });
  const form = el('form', { novalidate: '' });
  form.append(
    el('div', { class: 'field field--narrow' }, [el('label', { for: 'hh', text: 'People in your household' }), size]),
    el('div', { class: 'field field--narrow' }, [el('label', { for: 'inc', text: 'Household income per month, before tax (USD)' }), income]),
    el('div', { class: 'field field--narrow' }, [el('label', { for: 'rent', text: 'Monthly rent (USD), if you rent' }), rent]),
    el('fieldset', {}, [el('legend', { text: 'Do you live in the city?' }), el('div', { class: 'check' }, [resYes, el('label', { for: 'res-yes', text: 'Yes' })]), el('div', { class: 'check' }, [resNo, el('label', { for: 'res-no', text: 'No' })])]),
    el('button', { type: 'submit', class: 'btn btn--primary', text: 'Check' })
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = { householdSize: Number(size.value), monthlyIncome: income.value === '' ? NaN : Number(income.value), resident: resYes.checked ? true : resNo.checked ? false : null, monthlyRent: rent.value === '' ? undefined : Number(rent.value) };
    const p = validateAnswers(a);
    summary.hidden = p.length === 0;
    out.replaceChildren();
    if (p.length) { summary.replaceChildren(el('h2', { text: 'There is a problem' }), el('ul', {}, p.map((m) => el('li', { text: m })))); summary.focus(); return; }
    const rows = prescreen(cat.prescreen.programmes, a);
    out.append(el('h2', { text: 'Results' }), el('p', { class: 'notice', text: cat.prescreen.note }));
    for (const r of rows) {
      const card = el('div', { class: `pre ${r.likely ? 'is-likely' : ''}` });
      card.append(el('h3', { text: `${r.name}: ${r.likely ? 'you may be eligible' : 'unlikely on these answers'}` }), el('p', { class: 'meta', text: `Income limit for a household of ${a.householdSize}: $${r.incomeLimit.toLocaleString()} per month` }));
      if (r.reasons.length) card.append(el('ul', {}, r.reasons.map((x) => el('li', { text: x }))));
      else card.append(el('a', { href: `#/service/${r.id}`, text: 'See what you need to apply' }));
      out.append(card);
    }
  });
  root.append(h1('Benefits pre-screener'), el('p', { class: 'meta', text: 'Three questions. Nothing you enter is stored or sent.' }), summary, form, out);
  focusMain(root);
}
