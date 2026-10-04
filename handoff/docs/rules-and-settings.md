# Rules, settings & phases

## Phases

### Phase 1 · launch
- Public: Home, Events (+ detail, gallery, lightbox), Upcoming Events (+ detail, applications, waitlist), EESTEC Journey, Join Us (+ membership form), For Companies (+ inquiry form), Contact.
- Admin: login + 2-step, dashboard, Events, Applications, Inbox (contact, partner inquiries, membership applications), Pages (Home, Map, Journey, Join Us, Sponsors, Contact), Media library, Settings, Admin users.
- Hide anything that needs member accounts: header “Log in”, “Share your impression” buttons, Memories sections (they hide themselves when empty).

### Phase 2 · members
- Member sign-up → confirm e-mail → board approval; log in, password reset; header account menu.
- /members, /members/[username], /profile (profile, visibility, applications, Memories, consents, CV, delete account).
- Memories: list (cards only), post page, editor, approval flow, “changes waiting”.
- /submit (ideas and impressions) and Admin › Ideas & Feedback; Approvals queues for members and Memories.

### After launch · marked “Phase 2 · after launch” or “Future” on the canvas
- Memories map view (Cards/Map toggle).
- “Log in with eestec.net”, only if EESTEC International offers SSO.
- Macedonian (MK) content: the switcher is in the header from day 1; translations come later.
- Not planned: likes/reactions and comments on Memories (no moderation capacity).

> Naming note: the spec's Phase 2 already contains Memories and /submit. Items labelled “Phase 2 · after launch” on the canvas (Memories map) and “Future” (eestec.net login) come after both phases.

## Rules we decided

### Events
- Events and Upcoming Events are one table. An event is “upcoming” until its end date, then it moves to /events automatically.
- /upcoming/[slug] → 301 redirect to /events/[slug] once the event has ended.
- “Deadline soon” badge and red countdown start 72 hours before the application deadline (admin setting).
- “Just ended” badge in the archive for 14 days after the end date (admin setting).
- Max participants and waitlist on/off are set per event (defaults 24 and on, in Settings). Full + waitlist on → “Join the waitlist”; waitlist off → “Full”, disabled button.
- The application form closes automatically at the deadline. International events abroad can use an external application link instead.
- Optional sections (video, partners, gallery, Memories…) are hidden when empty.
- Lists use page numbers; page and filters live in the URL (e.g. /events?tab=local&type=workshop&page=2).

### Accounts, roles & security
- One login system (Supabase Auth) for members and admins, with roles. A board member can be both; their account menu shows “Admin panel”.
- Roles: Super admin (everything) · Editor (content, pages, approvals) · Event manager (only their own events and those events' applications) · Member (no admin access).
- 2-step login required for super admins. 5 failed log-ins → 15-minute pause. Password reset links expire after 30 minutes; e-mail confirmation links after 24 hours.
- Member sign-up: create account → confirm e-mail → board approval (status “Pending approval” until then).
- Default profile visibility is “Members only”. Enforce it with row-level security, not only in the UI. Visitors see name + team + lock.
- Delete account: removes profile, photo, CV, consents, applications and drafts. Checkbox “Also delete my Memories” (unchecked by default): unchecked keeps published Memories as “A former member” with no name or photo.
- “Log in with eestec.net” is hidden; future option only if EESTEC International offers SSO.

### Personal data & consent
- Every public form has a consent checkbox. On /submit the consent box appears only when an e-mail is entered.
- CV sharing is opt-in only: off by default, separate from the account consent, visible only to Main-package partners, every partner view logged. Turning it off removes access and deletes the file immediately.
- Phone is never shown publicly.

### Memories
- Statuses: Draft → Waiting for approval → Published, or Not approved (reason e-mailed and shown on /profile) → edit and resubmit.
- Editing a published Memory creates a pending revision; the live version stays until the board approves it. The author sees “Changes waiting for review” on the post.
- Visitors clicking “Share your memory” choose between logging in and sending a quick impression on /submit.
- Launch: cards only. Map view is “Phase 2 · after launch”. No likes or comments.

### Ideas & impressions
- Statuses (from the spec): New / Under review / Accepted / Archived.
- “Submit anonymously” is truly anonymous: name, e-mail and account are not stored, even for logged-in members.
- Spam protection on every public form: invisible check + honeypot. /submit also has a rate limit of 5 submissions per hour per device/IP.
- Visitors' impressions are feedback only, never public. Members can tick “Turn this into a Memories post” → Approvals › Memories.
- Ideas and feedback never go through Approvals (they are never public); they live in Admin › Ideas & Feedback.

### Content & UI
- Everything is edited in the admin: board roles and e-mails (add/remove/reorder), timeline, stats, meeting info, legal info, packages, contact person, steps, quotes…
- Brand: exactly #e52a30; #b81f24 for red text under 24px and hover; white text on red is Roboto 500/700 at 14px or larger.
- Active menu item: white pill with red text on the red header.
- Journey: hover only highlights; click/tap expands and stays open until closed; on mobile one step open at a time.
- Partner logos are sized by visual area (SVG or PNG); empty tiers are hidden; partners past their “active to” date move to Past partners.
- Contact subjects are routed to their own e-mail and can carry a shortcut link (Partnership → /partners, Membership → /join).
- Admin is calmer than the public site: white/grey, red only for primary actions, counts that need action, errors and deletes.

## Settings

| Setting | Default | Where |
|---|---|---|
| `deadline_soon_hours` | 72 | Settings › Events |
| `just_ended_days` | 14 | Settings › Events |
| `default_max_participants` | 24 | Settings › Events |
| `default_waitlist_enabled` | true | Settings › Events |
| `auto_archive_events` | true | Settings › Events |
| `weekly_meeting (day, time, room, show_on_home)` | Wed 18:00, Room 117 | Settings › Contact & legal |
| `main_email, address, office_room, legal info` | — | Settings › Contact & legal |
| `board_roles (title, email, order)` | editable list | Settings › Contact & legal |
| `logos (full colour, white, icon), site name, footer tagline` | — | Settings › Branding |
| `seo per page (title, description, share image)` | — | Settings › SEO |
| `notification e-mails (new submissions on/off, recipients)` | on | Settings › E-mail notifications / Ideas form settings |
| `submit_rate_limit_per_hour` | 5 | fixed in code (can become a setting) |
| `login_lockout (attempts, minutes)` | 5 / 15 | Settings › Security |

## Scheduled jobs & e-mails
- Every 10 min: close applications past their deadline; move ended events to the archive (no data change, only cache revalidation).
- Daily: database backup; delete submission_log rows older than 30 days; delete contact/idea e-mails older than 12 months where consent says so.
- On CV opt-out or account deletion: delete the CV file from Storage immediately.
- Transactional e-mails: application received / accepted / waitlist; membership application received; contact copy; partner inquiry copy; sign-up confirmation; account approved / rejected; password reset; Memory published / not approved; admin invite; board notification on new submissions.