# eestec.mk — Project Overview & Design System

Website for **EESTEC LC Skopje** (Electrical Engineering STudents' European assoCiation, Local Committee Skopje), based at the Faculty of Electrical Engineering and Information Technologies (FEEIT), Ss. Cyril and Methodius University, Skopje.

This file applies to **every page**. Each page has its own spec file in this folder.

---

## 1. Core principle: everything is managed through the Admin Panel

**No content is hardcoded.** Every text block, event, photo, member, sponsor, committee on the map, statistic and setting must be created, edited and deleted through the **Admin Panel** (see `11-admin-panel.md`).

- The board must be able to update the whole website without touching code.
- Each page spec below ends with an **"Admin-managed data"** section listing exactly what the admin must be able to edit for that page.
- Images are uploaded through the admin (no manual file uploads to the server).
- All user-submitted content (members, Memories, ideas, applications) goes through an **approval queue** in the admin before it becomes public.

---

## 2. Design system (must be consistent on ALL pages)

### Colors

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#e52a30` | EESTEC red: buttons, links, active menu items, highlights, icons, section accents |
| `--color-white` | `#ffffff` | Main background, text on red backgrounds |
| `--color-text` | `#1a1a1a` | Body text (neutral, for readability) |
| `--color-muted` | `#6b6b6b` | Secondary text, dates, captions |
| `--color-surface` | `#f5f5f5` | Card backgrounds, alternating sections |
| `--color-primary-dark` | `#b81f24` | Hover/pressed state of primary |

Only red and white are brand colors. Neutrals (black/greys) are allowed only for text, borders and surfaces. No other accent colors.

### Typography

- Font: **Roboto** (Google Fonts), fallback: `"Roboto", "Helvetica Neue", Arial, sans-serif`
- Weights: 300 (light), 400 (regular), 500 (medium), 700 (bold)
- Headings: Roboto 700; body: Roboto 400; buttons and labels: Roboto 500

| Element | Desktop | Mobile |
|---|---|---|
| H1 | 48px | 32px |
| H2 | 36px | 26px |
| H3 | 24px | 20px |
| Body | 16px | 16px |
| Small / captions | 14px | 14px |

### Logos

- Logos will be provided by LC Skopje (full color, white version for red backgrounds, and icon/favicon version).
- Store them under `/assets/logos/` and make them replaceable from the Admin Panel (Settings → Branding).
- White logo on red header/footer; red/full-color logo on white backgrounds.
- Favicon: generated from the icon version of the logo.

### Shared components (reuse everywhere, do not restyle per page)

- **Header / navigation**: logo left, menu right, sticky on scroll, hamburger menu on mobile. Active page highlighted in `#e52a30`.
- **Primary button**: `#e52a30` background, white text, 6–8px border radius, darker on hover.
- **Secondary button**: white background, `#e52a30` border and text.
- **Cards** (events, memories, members): white, subtle shadow, image on top, rounded corners.
- **Section title**: H2 with a short red underline accent.
- **Footer**: red background, white text and white logo, contact info, social links (Instagram, Facebook, LinkedIn), legal info of the association, copyright.
- **Forms**: consistent inputs, labels above fields, red focus outline, clear validation messages.

### Layout & quality rules

- Fully responsive (mobile first). Breakpoints: 640px, 1024px, 1280px.
- Max content width ~1200px, centered.
- Accessibility: contrast meets WCAG AA, alt text on all images (entered in admin), keyboard navigable menus.
- Performance: images compressed and lazy-loaded; thumbnails generated automatically on upload.
- SEO: title and meta description per page (editable in admin), Open Graph images for sharing.

---

## 3. Navigation (site map)

| Order | Menu item | Spec file |
|---|---|---|
| 1 | Home | `01-home.md` |
| 2 | Events | `02-events.md` |
| 3 | Upcoming Events | `03-upcoming-events.md` |
| 4 | Members | `04-members.md` |
| 5 | Memories | `05-memories.md` |
| 6 | EESTEC Journey | `07-eestec-journey.md` |
| 7 | Join Us | `08-become-an-eestecer.md` |
| 8 | Contact | `10-contact.md` |
| — | Submit Idea / Impression (linked from Memories, footer and Home) | `06-submit-idea.md` |
| — | Sponsors (section on Home + "For Companies" page) | `09-sponsors.md` |
| — | Admin Panel (`/admin`, login required) | `11-admin-panel.md` |

---

## 4. Language

- Website content is in **English** by default.
- Build with i18n support so a Macedonian (MK) version can be added later; the language switcher goes top-right in the header.

---

## 5. Suggested technical approach

- Frontend: any modern framework (e.g. Next.js / React).
- Backend + database + auth + file storage: e.g. Supabase or Firebase (or a headless CMS such as Strapi/Directus).
- Roles: `admin` (board), `member`, `public visitor`.
- Personal data: members must give consent at registration and choose profile visibility (public / members only).

## 6. Build phases

1. **Phase 1**: Home, Events, Upcoming Events, EESTEC Journey, Join Us, Sponsors, Contact, and the Admin Panel for these.
2. **Phase 2**: Member registration and profiles, Memories, Submit Idea/Impression, approval queues.
