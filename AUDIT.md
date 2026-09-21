# AUDIT — Government Service Portal (pre-refactor)

Audit of the previous build: one 841-line `index.html` (markup, CSS and
a 100-line inline search script) with two documents,
`docs/accessibility-compliance.md` and `docs/ux-research-findings.md`.
The page was a landing page whose only working feature was a substring
search over 24 names; every "Access Service" button and 19 other links
pointed at `#`. The documents made claims the project could not
support. Line numbers refer to the old `index.html`.

---

## A. Honesty of the copy and the documents

### A1 — "An official website of a government organization"
Line 546: a government banner with a flag, styled after the USWDS
banner, on a personal prototype. **Fix:** replaced by a banner that
says the opposite — a prototype for a fictional jurisdiction, not a
government website, with nothing sent anywhere.

### A2 — A UX research study that did not happen
`docs/ux-research-findings.md` reported 42 interviews, 18 contextual
inquiry sessions, 24 usability participants and 1,200 survey
respondents, with percentages drawn from them. None of it occurred.
**Fix:** rewritten as design rationale with illustrative personas,
opening with a statement that the previous figures were invented, and
listing the research the prototype would need before any launch.

### A3 — WCAG 2.1 AA "Pass" on every row, "axe: 0 violations",
"Lighthouse 100"
`docs/accessibility-compliance.md` listed criteria as passed and quoted
tool results that were never produced. **Fix:** rewritten as an
accessibility statement that reports what was measured on the current
build — axe-core 4.13.0 across seven routes, hand-computed contrast
ratios for every palette pair, keyboard checks — and lists what was not
tested.

## B. What the software did not do

### B1 — Nineteen links to `#`
Every service card, quick link, footer link and navigation item was a
dead anchor. **Fix:** a hash router with real views: service detail
with fee and timeline, a four-step permit application, a status check,
a pre-screener, and a catalogue you can browse by category.

### B2 — No form, no validation
The portal offered applications and had no form. **Fix:**
`src/forms.js` validates a schema with required, format, range, date,
conditional and length rules and returns errors in field order; the
page renders an error summary that links to fields, sets
`aria-invalid` and `aria-describedby`, and saves a draft to resume.

### B3 — No fees, no timelines, no rules
Descriptions only. **Fix:** `data/services.json` carries fee rules
(flat, per unit with a minimum, tiered), processing days and required
documents for 24 services, validated on load; `computeFee` and
`expectedDecision` (business days) are tested.

### B4 — No reference numbers, no status
**Fix:** references are `EC-YYYY-NNNNNN-C` with a Luhn check digit, so
a typo is rejected before lookup; status derives from submission and
expected-decision dates.

### B5 — A "Benefits Enrollment" card with no way to know if you qualify
**Fix:** a three-question pre-screener over illustrative thresholds,
labelled as not a determination, with the reason for every "unlikely".

## C. Correctness found while building

### C1 — `Date.parse('2026-02-30')` is valid in V8
It rolls to 2 March. The first version of the date rule accepted it;
the test caught it. **Fix:** a real date must survive a round trip
through `toISOString()`.

## D. Security and structure

### D1 — No CSP; `innerHTML` with search input; 3 `style=`
Line 760 built result markup by string concatenation from service
names. **Fix:** `default-src 'none'; script-src 'self'` with no external
scripts; `textContent` and `el()` everywhere; user input (search,
answers, references) never reaches markup.

### D2 — Unsplash image in structured data
Line 542. **Fix:** removed.

## E. Engineering

### E1 — No tests, no CI
**Fix:** 13 Vitest tests at 100 % statement coverage over the three
logic modules, including invalid catalogues, every validation rule,
Luhn vectors, business-day counting and pre-screener reasons; ESLint,
html-validate, security scan and Pages deployment.
