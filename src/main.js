/** Hash router and Executive Shell for the portal prototype. */
import { validateCatalogue } from './catalogue.js';
import { mountExecShell } from './exec-shell.js';
import { $ } from './ui.js';
import { renderApply, renderDone, renderHome, renderPrescreen, renderService, renderStatus, store } from './views.js';

let cat = null;
let shell;

function route() {
  const root = $('view');
  const h = window.location.hash.replace(/^#\/?/, '');
  const [head, ...rest] = h.split('/');
  if (head === 'service') renderService(root, cat, rest[0]);
  else if (head === 'apply') renderApply(root, cat, rest[0] === 'review' ? 'review' : Number(rest[0] ?? 0) || 0);
  else if (head === 'done') renderDone(root, rest[0]);
  else if (head === 'status') renderStatus(root);
  else if (head === 'prescreen') renderPrescreen(root, cat);
  else renderHome(root, cat);
  shell?.refreshKpis();
}

async function boot() {
  cat = await fetch('data/services.json').then((r) => r.json());
  const problems = validateCatalogue(cat);
  if (problems.length) { $('view').textContent = `Catalogue invalid: ${problems.join(' · ')}`; return; }
  window.addEventListener('hashchange', route);
  route();
  shell = mountExecShell({
  theme: 'ember',
    title: 'Government Service Portal',
    tagline: `A prototype of citizen-facing service delivery for a fictional city: a searchable catalogue of ${cat.services.length} services with fee rules and processing times, a complete permit application with validation, save-and-resume, review and a checksummed reference, a status check, and a benefits pre-screener that says what it is not. Not a government website.`,
    repo: 'https://github.com/Freddricklogan/Government-Service-Portal',
    pagesUrl: 'https://freddricklogan.github.io/Government-Service-Portal/',
    badges: [{ label: 'Prototype — fictional jurisdiction', tone: 'accent' }, { label: 'axe: see README', dot: true }, { label: 'Nothing is sent', dot: true }],
    kpis: [
      { label: 'Services', compute: () => cat.services.length, tone: 'accent' },
      { label: 'Online', compute: () => cat.services.filter((s) => s.online).length, tone: 'ok' },
      { label: 'Applications in this browser', compute: () => store.get().applications.length },
      { label: 'Draft saved', compute: () => (store.get().draft ? 'yes' : 'no'), tone: 'muted' }
    ],
    tour: [
      { selector: '#view', title: 'Search that ranks', body: 'Name matches outrank keywords, which outrank category and summary; every word must match. Try "deck" — it finds the building permit through a keyword.', action: () => { window.location.hash = '#/'; setTimeout(() => { const q = $('q'); if (q) { q.value = 'deck'; q.dispatchEvent(new Event('input')); } }, 50); } },
      { selector: '#view', title: 'A form that follows the pattern', body: 'Required fields, formats, ranges and a real-date check; an error summary that lists problems in order and links to each field; aria-invalid and aria-describedby on every input; save-and-resume in your browser.', action: () => { window.location.hash = '#/apply/0'; } },
      { selector: '#view', title: 'Review, submit, reference', body: 'The review page shows every answer with a Change link and the fee computed from the catalogue rule. The reference number carries a Luhn check digit, so a typo is caught before a lookup.', action: () => { window.location.hash = '#/status'; } },
      { selector: '#view', title: 'A pre-screener that knows its limits', body: 'Three questions against illustrative thresholds, with the reason for every "unlikely". It says, on the page, that it is not a determination.', action: () => { window.location.hash = '#/prescreen'; } }
    ]
  });
  shell.refreshKpis();
}

boot();
