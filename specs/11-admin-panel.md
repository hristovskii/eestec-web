# Admin Panel

**Route:** `/admin` (login required, not visible in the public menu)
**Goal:** One interface through which the board manages **all** website content and data. Nothing on the public site should require editing code.

The admin uses the same brand identity (`#e52a30`, `#ffffff`, Roboto, LC Skopje logo) in a clean dashboard layout: sidebar navigation on the left, content area on the right.

---

## Roles & permissions

| Role | Access |
|---|---|
| **Super admin** | Everything, including users, roles and settings |
| **Editor** (board / PR / IT) | Content: events, memories, sponsors, pages; approval queues |
| **Event manager** | Their events and applications only |
| **Member** | No admin access (only own profile on the public site) |

Role management is done by the super admin inside the panel.

---

## Dashboard (home of the admin)

- Counters: pending member approvals, pending Memories, new ideas/feedback, new membership applications, new contact/company messages, applications for open events.
- Quick actions: "Add event", "Add sponsor", "Approve memories".

## Sections (sidebar)

| Section | What can be managed | Related spec |
|---|---|---|
| **Home page** | Hero, "What is EESTEC", timeline, statistics, weekly meeting info, section order/visibility | `01-home.md` |
| **Map / Committees** | Committee list (name, city, country, status, coordinates, link) or eestec.net API sync | `01-home.md` |
| **Events** | All events (past and upcoming), galleries, types | `02-events.md`, `03-upcoming-events.md` |
| **Applications** | Form builder per event, applications list, statuses, CSV/Excel export | `03-upcoming-events.md` |
| **Members** | Approve registrations, roles, teams, board per mandate, alumni, badges | `04-members.md` |
| **Memories** | Approval queue, edit, feature, delete, comments | `05-memories.md` |
| **Ideas & Feedback** | Inbox, statuses, notes, ratings per event | `06-submit-idea.md` |
| **EESTEC Journey** | Steps, quotes, call-to-action | `07-eestec-journey.md` |
| **Join Us** | Texts, rules, FAQ, documents, membership applications | `08-become-an-eestecer.md` |
| **Sponsors** | Sponsors, tiers, partnership PDF, company inquiries | `09-sponsors.md` |
| **Contact** | Contact details, social links, routing, messages | `10-contact.md` |
| **Media library** | All uploaded images and files, alt text, reuse across pages | — |
| **Settings** | Logos (upload provided logos: full color, white, icon/favicon), site name, SEO defaults, footer texts, e-mail notification settings, languages | `00-overview-and-design-system.md` |
| **Admin users** | Add/remove admins, assign roles | — |

---

## General admin requirements

- **WYSIWYG / rich text editor** for all long texts.
- **Image upload** with automatic compression and thumbnails; drag and drop; multi-upload for galleries; alt text field.
- **Draft / Published / Hidden** status for every content item; "Preview" before publishing.
- **Drag and drop ordering** for lists (timeline, steps, FAQ, sponsors, board).
- **Approval queues** for all user-generated content (registrations, Memories, impressions).
- **Export** of applications and member lists to CSV/Excel.
- **E-mail notifications** to the board for new submissions (configurable).
- **Activity log**: who changed what and when.
- Secure login (strong passwords, optional 2FA), session timeout.
- Daily automatic database backups.
- Fully usable on mobile so board members can approve things on the go.
