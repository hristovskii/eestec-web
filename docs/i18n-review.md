# Macedonian strings to review

Every Macedonian UI string is drafted by Claude from the English design copy (D14) and must be
reviewed by a native speaker. When a group is reviewed, tick it here.

Source of the strings: `src/shared/i18n/messages/mk.json` (its `_meta.status` stays `needs-review`
until every row below is ticked). Board content (events, page texts…) is not listed here: it is
written by the board in the admin.

| Milestone | Namespace / keys                                                                   | Status              |
| --------- | ---------------------------------------------------------------------------------- | ------------------- |
| M0        | `common.*` (site name, skip link, language switch)                                 | ☐ needs review      |
| M0        | `metadata.*` (default title, description)                                          | ☐ needs review      |
| M0        | `notFound.*`, `error.*` (404 and error pages)                                      | ☐ needs review      |
| M0        | `placeholder.foundation` (temporary home text, removed in M8)                      | ☐ needs review      |
| M1        | `ui.*` (pagination, countdown, form kit, rating, filters)                          | ☐ needs review      |
| M2        | `nav.*`, `footer.*`, `privacy.*` (site chrome, privacy page)                       | ☐ needs review      |
| M6        | `events.*` (archive, filters, empty states, card, event page)                      | ☐ needs review      |
| M6        | `ui.lightbox.*` (gallery and lightbox)                                             | ☐ needs review      |
| M7a       | `upcoming.*` (list, Next up, empty states)                                         | ☐ needs review      |
| M7a       | `applications.*` (states, ApplyBox, form, errors, confirmation)                    | ☐ needs review      |
| M7a       | Default application fields (`applications/domain/default-form.ts`)                 | ☐ needs review      |
| M8a       | `committees.*` (map, filters, legend, popup, list view)                            | ☐ needs review      |
| M8c       | `home.*` (hero card, About, timeline, meeting, latest), `committees.section.*`     | ☐ needs review      |
| M9b       | `journey.*` (hero, step card, path, call to action, Home teaser)                   | ☐ needs review      |
| M10b      | `join.*` (hero, menu, section labels, rules, FAQ)                                  | ☐ needs review      |
| M10c      | `join.form.*`, `join.success.*`, `join.closed.*`, `join.apply.*` (membership form) | ☐ needs review      |
| M11b      | `partners.*` (logo, marquee, offer), `home.partners.*` (Home partner strip)        | ☐ needs review      |
| M11c      | `partners.form.*` (partnership inquiry form, errors, confirmation)                 | ☐ needs review      |
| M12b      | `contact.*` (contact info, copy buttons, map, legal info labels)                   | ☐ needs review      |
| M12c      | `contact.form.*`, `ui.form.spam.*` (contact form, spam check row)                  | ☐ needs review      |
| —         | Fixed label decided in D7: `deadline_soon` → "Се затвора наскоро"                  | ✓ given by the user |

## What the M13 pass found (for the native reviewer)

Claude can check that the two languages say the same thing and that the typography is consistent;
it cannot judge tone or naturalness. `src/shared/i18n/messages.test.ts` now checks every build:
both languages have the same placeholders and rich-text tags, no `...`, doubled or trailing
spaces, straight double quotes, or words written half in Latin and half in Cyrillic. At 360 px every
public page in Macedonian has no sideways scroll and no cut-off text (`e2e/mk-layout.spec.ts`).

**Changed (one concept, one word):** the weekly meeting was "состанок" in three places and "средба"
in nine. It is now "средба" everywhere ("Неделна средба"), and the test keeps it that way.

**Needs a decision (not changed):**

1. **Form of address.** The Macedonian copy uses the formal "Вие / -ете" (about 70 strings: events,
   upcoming, applications, the partner and contact forms, the error pages) and the informal "ти"
   (about 20 strings: committees section, Home meeting, Journey, Join Us, the file upload text) side by
   side. A student association usually writes to students with "ти" and to companies with "Вие".
   Proposal: "ти" on every page for students (events, upcoming, applications, Join, Journey, Home,
   Contact) and "Вие" only on For Companies and its form. The strings affected are listed by
   `grep -nE "ете\b|Ваш" src/shared/i18n/messages/mk.json`. Not rewritten here because it changes
   about 70 strings that only a native speaker can judge.
2. **"борд" or "одбор".** "бордот" (the board) is used in three strings, "одбор" in the footer.
3. **"е-пошта" or "е-порака".** "е-пошта" is used 17 times, "е-порака" twice (confirmation e-mails).
   Both are correct; decide whether the confirmation should say "е-пошта за потврда" like Join Us.
4. **English sample text on Macedonian pages.** Board content (hero, events, partners…) is English
   sample text until the board writes Macedonian; it is not in this list (see `docs/sample-data.md`).
