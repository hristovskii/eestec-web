# Page: Upcoming Events

**Route:** `/upcoming` and `/upcoming/[slug]`
**Goal:** Show future events and let students **apply directly through the website**.

Follows the global design system in `00-overview-and-design-system.md`.

---

## List page (`/upcoming`)

- Cards sorted by date (soonest first), same card style as Events.
- Each card: cover photo, title, dates, location, type, local/international badge, **application status** badge:
  - Applications open (red `#e52a30` badge)
  - Opening soon
  - Applications closed
- Countdown to the application deadline on each card.
- Empty state if there are no upcoming events: "No upcoming events right now. Follow us on Instagram so you don't miss the next one."

---

## Detail page (`/upcoming/[slug]`)

- Cover photo, title, dates, location, type
- Description, agenda / schedule, requirements (who can apply), participation fee (if any)
- Application deadline with countdown
- **"Add to calendar"** button (Google Calendar / .ics file)
- **Application form** (shown only while applications are open):
  - Fields configurable per event in the admin, e.g. full name, e-mail, phone, faculty, year of study, member / non-member, motivation letter, CV upload, dietary needs, T-shirt size
  - Consent checkbox for personal data processing
  - Confirmation message on screen + confirmation e-mail after submission
- For international events abroad (organized by other committees): button linking to the external application (e.g. on eestec.net) instead of the internal form.

---

## Automatic behavior

- When the application deadline passes, the form closes automatically.
- When the event ends, it moves to the `/events` archive automatically (same database as Events).

---

## Admin-managed data

- All event fields (shared with `02-events.md`)
- Application open date, deadline, max participants
- Internal form vs external link
- **Form builder**: add, remove and reorder fields per event (text, long text, select, checkbox, file upload)
- **Applications list** per event: view, filter, change status (pending / accepted / rejected / waitlist), export to CSV/Excel, optional e-mail to accepted participants
