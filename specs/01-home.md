# Page: Home (One Page)

**Route:** `/`
**Goal:** In one scroll, explain what EESTEC is, show the tradition of LC Skopje, show where EESTEC exists in Europe, and push visitors to join or apply for events.

Follows the global design system in `00-overview-and-design-system.md` (`#e52a30`, `#ffffff`, Roboto, provided logos).

---

## Sections (top to bottom)

### 1. Hero
- Full-width background (photo or red `#e52a30` with white text).
- Headline + short subtitle (e.g. "Connecting electrical engineering and computer science students across Europe").
- Primary button: **Join Us** → `/join`
- Secondary button: **Upcoming Events** → `/upcoming`
- Countdown to the next upcoming event (pulled automatically from Upcoming Events). Hidden if no upcoming event exists.

### 2. What is EESTEC
- Short text: non-profit, non-political student association, founded in 1986 in the Netherlands, network of Local Committees across Europe.
- Main activities as icon cards: Workshops, Exchanges, Motivational Weekends, Soft Skills trainings, Competitions, Congress.
- Link to eestec.net.

### 3. Tradition of LC Skopje
- Horizontal (desktop) / vertical (mobile) timeline.
- Example milestones: international networking workshop in 2005 with a weekend in Ohrid; hosting the EESTEC Chairpersons' Meeting (ECM); RoboMac competition co-organized with IEEE SB and the FEEIT Student Parliament.
- Each milestone: year, title, short text, optional photo.

### 4. EESTEC in numbers
- Animated counters, e.g.: number of Local Committees, countries, EESTEC members in Europe, LC Skopje members, events organized by LC Skopje.

### 5. Interactive map of EESTEC committees
- Map of Europe (e.g. Leaflet + OpenStreetMap) with a pin for every Local Committee / Observer / JLC.
- Pin colors: LC Skopje highlighted in `#e52a30`, other committees in a neutral/darker tone.
- Clicking a pin shows: committee name, city, country, status (LC / Observer / JLC), website/social link.
- **Data source:** first check whether eestec.net exposes the committee list via an API (inspect the network requests of eestec.net or ask the EESTEC international IT team). If an API is available, sync from it automatically. If not, the committee list is maintained manually in the Admin Panel (name, city, country, status, latitude, longitude, link).
- Optional layer: pins for cities where LC Skopje members have been (from Memories).

### 6. Weekly meetings
- Small highlighted box: "We meet every [day] at [time] in [room], FEEIT." Visible and easy to update.

### 7. Latest activity
- Last 3 past events (cards → event detail page).
- Last 3 approved Memories (cards → memory post).

### 8. EESTEC Journey teaser
- Compact version of the journey steps with a button to `/journey`.

### 9. Sponsors & partners
- Logo strip at the bottom of the page (see `09-sponsors.md`). Always placed directly above the footer.

### 10. Footer
- Global footer (red background, white logo, contacts, social links, legal info).

---

## Admin-managed data

- Hero: background image, headline, subtitle, button labels and links
- "What is EESTEC" text and activity cards (icon, title, text)
- Timeline milestones (CRUD, ordering)
- Statistic counters (label + value)
- Committees for the map (CRUD) or API sync settings
- Weekly meeting info (day, time, room, visible on/off)
- Section visibility toggles and ordering
- SEO title, meta description, share image
