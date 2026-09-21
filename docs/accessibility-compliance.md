# Accessibility statement — Government Service Portal prototype

This statement replaces an earlier document that listed WCAG 2.1 AA criteria as "Pass" and quoted tool scores that were never produced. Everything below was measured on the current build on the date given, with the method stated. Where something was not tested, it says so.

## What was measured (2026-09-21)

**Automated:** axe-core 4.13.0 run in headless Chromium against seven routes — home, service detail, application step 1 (with the error summary showing), step 2, review, status check and pre-screener (with its error summary showing) — using the rule tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `best-practice`.

| Route | Violations | Rules passed | Incomplete |
| --- | --- | --- | --- |
| `#/` | 0 | 42 | color-contrast (2 nodes, see below) |
| `#/service/building-permit` | 0 | 41 | color-contrast (2) |
| `#/apply/0` with errors | 0 | 42 | color-contrast (2) |
| `#/apply/1` | 0 | 41 | color-contrast (2) |
| `#/apply/review` | 0 | 38 | color-contrast (2) |
| `#/status` | 0 | 42 | color-contrast (2) |
| `#/prescreen` with errors | 0 | 41 | color-contrast (2) |

The two "incomplete" nodes are the shell header title and tagline, which sit on a gradient axe cannot resolve. Their contrast was computed by hand from the gradient's end colours (`#111a2e` to `#111a2d` over `#0b1220`): title `#e6edf3` 14.7:1, tagline `#8b98b0` 5.96:1. Every other foreground/background pair in the palette was computed the same way; the lowest is danger text `#f85149` on panel `#111a2e` at 5.17:1, above the 4.5:1 minimum.

One violation was found and fixed during the audit: the skip link sat outside any landmark (`region`, best practice). It now sits inside `main`.

**Keyboard, checked in the same session:** on load, focus moves to the content region; Tab then reaches the search field. Shift+Tab reaches the skip link, and Enter on it moves focus to the content region. Form errors move focus to the error summary; each summary link moves focus to its field. Every control is a native `button`, `a`, `input`, `textarea` or `select`; there are no custom widgets and no keyboard traps. Focus is visible as a 3 px `#ffbf47` outline on every focusable element.

**Not tested:** screen readers (VoiceOver, NVDA, JAWS), voice control, 200 % zoom reflow, Windows High Contrast, and users with disabilities. The document does not claim conformance; it reports what was run.

## Techniques in the build

- One `h1` per view; headings in order; landmarks `main` and `nav` with labels.
- Every input has a visible `label`; hints and errors are linked through `aria-describedby`; invalid fields carry `aria-invalid="true"` and a visible "Error:" prefix; the error summary uses `role="alert"`, receives focus, and lists errors in field order with links.
- The conditional contractor-licence field is hidden with the `hidden` attribute (removed from the accessibility tree), not with CSS alone.
- Search results, status results and pre-screener results are announced through `aria-live="polite"` regions.
- Dates use native `input type="date"` with a `min`; numbers use `inputmode="numeric"`; autocomplete tokens are set on name, email, telephone and postal code.
- The layout reflows to 400 px without horizontal scrolling on every route (measured).
- No content depends on colour alone: status and eligibility results carry text.

## Reporting a problem

Open an issue in the repository. Because the prototype has no users, no formal feedback route exists; the statement will be updated whenever the measurements are repeated.
