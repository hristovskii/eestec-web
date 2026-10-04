# Page: EESTEC Memories

**Route:** `/memories` and `/memories/[slug]`
**Goal:** Blog-style page where every member shares impressions from events and places they have been, with photos and descriptions.

Follows the global design system in `00-overview-and-design-system.md`.

---

## List page (`/memories`)

- Masonry or card grid of posts, newest first.
- Each card: cover photo, title, author (photo + name), event name, city/country, date, short excerpt.
- Filters: by event, by year, by city/country, by author.
- Optional **map view** toggle: each memory shown as a pin in the city where it happened (same map style as the Home page).
- Button "Share your memory" → logged-in members go to the editor; visitors are sent to login or `/submit`.

---

## Post page (`/memories/[slug]`)

- Title, author, date, linked event (→ event detail page), city/country
- Rich text body
- Photo gallery with lightbox
- Optional likes / reactions
- Optional comments (members only, moderated)
- "More memories from this event" section

---

## Creating a memory (members only)

- Editor fields: title, linked event (select from events list, or "other"), city, country, date, text (rich text: bold, lists, headings, links), cover photo, gallery photos (multi-upload)
- Save as draft / submit for review
- After submission the post is **"Pending approval"** until an admin publishes it.

---

## Admin-managed data

- Approval queue: preview, approve, reject (with optional note to the author), edit before publishing
- Feature a memory on the Home page
- Delete posts and comments
- Comment moderation
