# Case Study — Government Service Portal

**Repository:** [Government-Service-Portal](https://github.com/Freddricklogan/Government-Service-Portal) · **Live demo:** [freddricklogan.github.io/Government-Service-Portal](https://freddricklogan.github.io/Government-Service-Portal/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

Digital service teams in cities and agencies who must show a working pattern before procurement; the accessibility and records officers who will be asked to sign off on it; and residents who meet these services when something in their life needs a permit, a certificate or help with rent. I advise public-sector organisations on digital transformation, and the artefact they most often have is a landing page that looks finished and does nothing.

## 2. The problem, as a scenario

A city team presents a portal prototype to its leadership. It has an official-looking banner, six service cards and a compliance document with every WCAG criterion marked "Pass". A councillor clicks "Access Service" and lands back where she started. The accessibility officer asks which tool produced the "0 violations" and is told none did. The research appendix cites 1,200 survey respondents; there was no survey. The earlier version of this repository was that prototype. It was not malicious; it was a mock-up that had been allowed to speak in the voice of a system.

## 3. What it costs to leave it alone

Procurement decisions get made on a picture, and the vendor who later builds the real thing inherits requirements no one tested. A compliance table that was never measured is worse than none: it forecloses the audit that would have found the problems. A fabricated research appendix, once noticed, discredits every genuine finding the team later produces. And residents pay for all of it in forms that cannot be completed with a screen reader and fees nobody could quote in advance.

## 4. The approach, and the alternative I rejected

I rejected polishing the landing page and adding a fake login. The prototype had to do the things a service does, for a jurisdiction it openly calls fictional. `data/services.json` holds 24 services with fee rules, processing days and required documents; `src/catalogue.js` validates it, searches it with a ranked matcher, computes fees and counts business days. `src/forms.js` validates a schema — required, format, range, real date, conditional, length — and returns errors in field order so the page can render the summary the U.S. Web Design System and GOV.UK patterns describe; it also makes reference numbers with a Luhn check digit and derives a status from dates. `src/eligibility.js` pre-screens three programmes against illustrative thresholds and returns the reason for every failure. The two documents were rewritten: the accessibility statement reports what axe-core measured on this build and what was not tested, and the research document opens by saying the previous figures were invented.

## 5. What the code does today

The home view searches the catalogue and browses it by category; a service page shows the summary, what you will need, the fee — with a calculator when the rule depends on cost, copies or attendance — and the expected decision date if submitted today. The building-permit application runs in four steps with a save-and-resume draft; submitting with problems produces an error summary that receives focus and links to each field, and the contractor-licence field disappears for owner-builders. The review page lists every answer with a Change link and the computed fee; submitting produces a reference such as EC-2026-167487-1 and a confirmation. The status view rejects a mistyped reference by its check digit and otherwise reports received, in review or decision due. The pre-screener asks household size, income, rent and residence and explains each result. A banner on every view says the jurisdiction is fictional and nothing leaves the browser.

## 6. Evidence

Thirteen Vitest tests cover catalogue validation with named problems, search ranking and the every-token rule, flat, per-unit-with-minimum and tiered fees, business-day counting across weekends, every validation rule with its message, the conditional field, Luhn against published vectors, reference round-trip and rejection, status by date, and pre-screener reasons including the rent-burden rule. Statement coverage of the modules is 100 %. axe-core 4.13.0 ran in headless Chromium on seven routes including two error states and reported zero violations, with 38 to 42 rules passed per route; the two nodes it could not resolve sit on a gradient and were computed by hand at 14.7:1 and 5.96:1. In the browser, an empty step produced three errors in order with focus on the summary, the fee read $300 at $25,000 of work, a submitted application produced a valid reference and a bad check digit was rejected, and no route scrolled horizontally at 1280 or 400 pixels. `AUDIT.md` records twelve findings.

## 7. What it would take to run this in production

Replace local storage with an authenticated case-management backend and a payment gateway; add identity verification appropriate to each service; make the catalogue an administered dataset with versioned rules and effective dates; run usability sessions with residents including assistive-technology users; and complete the records-management, privacy and security assessments a real service requires. The validation, fee and reference modules would move unchanged.

## 8. Limits and next steps

One application form is built; the other 23 services show their rules but not a form. Thresholds and fees are placeholders. Applications exist only in one browser. Screen readers were not tested. Next, in order: a second form generated from the same schema machinery to prove it generalises, an appointment booking view, and a printable confirmation.

## 9. Who should look at this

**Hiring manager:** evidence that I build public-sector patterns correctly, measure accessibility instead of asserting it, and remove fabricated claims from my own earlier work.
**Consulting client:** a reference for what a service prototype should be able to do before procurement, and how an accessibility statement should read.
**Engineer:** read `src/forms.js` with `tests/forms.test.js` for the validation contract and the real-date fix, and `docs/accessibility-compliance.md` for the audit method.
