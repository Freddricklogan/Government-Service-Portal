# Design rationale and illustrative personas — Government Service Portal prototype

**This document replaces a previous version that described a research study — interviews, contextual inquiry, three rounds of usability testing and a 1,200-respondent survey — that did not take place. Those figures were invented and have been removed.** What follows is design rationale drawn from published public-sector design guidance, and personas written to exercise the prototype. They are illustrations, not findings.

## Sources the design follows

- The U.S. Web Design System's patterns for forms: one question per section, visible labels, hint text, error summaries that link to fields, and messages that say what to do rather than what went wrong.
- GOV.UK Service Manual guidance on "check your answers" pages, save-and-return, and reference numbers users can read back over the telephone.
- WCAG 2.1 AA as the accessibility target, with what was actually measured recorded in `accessibility-compliance.md`.

## Illustrative personas

These are constructed to cover the paths in the prototype. No person was interviewed.

**Homeowner applying for a permit.** Wants to know the fee and the timeline before starting, does not know whether a contractor licence number is required for owner-built work, and may stop halfway to find a document. The prototype answers the fee and the expected decision date on the service page, hides the contractor field for owner-builders, and saves a draft in the browser.

**Resident checking benefits.** Wants a quick, private answer to "is it worth applying?" without creating an account. The pre-screener asks three questions, stores nothing, and gives a reason for every "unlikely" so the person can judge whether a change in circumstances would matter. It says on the page that it is not a determination.

**Someone following up an application.** Has a reference number from an email and wants to know whether anything is expected of them. The reference carries a check digit so a mistyped number is caught before a lookup; the status is derived from the submission and expected-decision dates.

**A screen-reader user completing the form.** Needs errors announced and reachable, fields described by their hints, and no custom widgets. The error summary receives focus and links to each field; every input is native.

## Design decisions the prototype makes

1. **Fees and timelines are computed from the catalogue rules**, not typed into the page, so the service page and the review page cannot disagree.
2. **Validation messages follow the "Enter …" / "… must be …" pattern** and are listed in field order in a summary that links to each field.
3. **A real-date check** rejects dates such as 30 February that the platform would otherwise roll forward.
4. **Nothing is sent anywhere.** The prototype states this in a banner; a production service would replace local storage with an authenticated backend and would need the security, privacy and records-management work that implies.

## What research this prototype would need before any launch

Usability sessions with residents across the personas above, including people using assistive technology; content testing of the plain-language summaries and error messages; and an equity review of the pre-screener thresholds with the programme owners. None of that has been done.
