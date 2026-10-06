# Macedonian strings to review

Every Macedonian UI string is drafted by Claude from the English design copy (D14) and must be
reviewed by a native speaker. When a group is reviewed, tick it here.

Source of the strings: `src/shared/i18n/messages/mk.json` (its `_meta.status` stays `needs-review`
until every row below is ticked). Board content (events, page texts…) is not listed here: it is
written by the board in the admin.

| Milestone | Namespace / keys                                                  | Status              |
| --------- | ----------------------------------------------------------------- | ------------------- |
| M0        | `common.*` (site name, skip link, language switch)                | ☐ needs review      |
| M0        | `metadata.*` (default title, description)                         | ☐ needs review      |
| M0        | `notFound.*`, `error.*` (404 and error pages)                     | ☐ needs review      |
| M0        | `placeholder.foundation` (temporary home text, removed in M8)     | ☐ needs review      |
| M1        | `ui.*` (pagination, countdown, form kit, rating, filters)         | ☐ needs review      |
| M2        | `nav.*`, `footer.*`, `privacy.*` (site chrome, privacy page)      | ☐ needs review      |
| M6        | `events.*` (archive, filters, empty states, card, event page)     | ☐ needs review      |
| M6        | `ui.lightbox.*` (gallery and lightbox)                            | ☐ needs review      |
| —         | Fixed label decided in D7: `deadline_soon` → "Се затвора наскоро" | ✓ given by the user |
