# Page: Events (Archive)

**Route:** `/events` and `/events/[slug]`
**Goal:** Archive of all past events organized or attended by LC Skopje, divided into **Local** and **International**.

Follows the global design system in `00-overview-and-design-system.md`.

---

## Events list page (`/events`)

### Tabs
- **Local Events**: events organized in Skopje for local students (lectures, local workshops, trainings, socials, career days, RoboMac, Soft Skills Academy, local rounds of competitions).
- **International Events**: events with international participants: workshops, exchanges, motivational weekends, ECM, Congress, and international events abroad attended by LC Skopje members.

### Filters & search
- Filter by type: Workshop, Exchange, Motivational Weekend, Training / Soft Skills, Competition, Conference / Statutory, Social, Other.
- Filter by year.
- Text search by title.
- Sort: newest first (default).

### Event card
- Cover photo, title, year, type badge, location (city), "Organized by LC Skopje" badge where applicable.
- Hover effect with `#e52a30` accent. Click opens detail page.

### Pagination
- 12 events per page, or "Load more" button.

---

## Event detail page (`/events/[slug]`)

- Large cover photo
- Title, year / exact dates, type, local or international, location, organizing committee
- Description (rich text)
- **Photo gallery**: grid of thumbnails, lightbox on click (swipe on mobile)
- Optional: video embed (YouTube), partners of the event, number of participants
- **Memories from this event**: approved Memories posts linked to this event (see `05-memories.md`)
- Button: "Were you there? Share your impression" → `/submit`
- Previous / next event navigation

---

## Connection with Upcoming Events

Events and Upcoming Events use the **same database table**. When an event's end date passes, it automatically moves from `/upcoming` to the `/events` archive. Nothing is entered twice.

---

## Admin-managed data

- Event CRUD: title, slug, category (local/international), type, start and end date, location, organizing committee, description, cover photo, gallery (multi-upload, reorder, captions, alt text), video link, partners, participant count
- Publish / draft / hidden status
- Event types list (editable)
- Bulk photo upload for galleries
