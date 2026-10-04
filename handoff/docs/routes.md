# Routes

Frame names refer to files in `design-source/` and screenshots in `screens/` (see `frames.md`).


## Public

| Route | What | Canvas frames | Phase |
|---|---|---|---|
| `/` | Home: hero, what is EESTEC, timeline, numbers, committee map, weekly meeting, latest events & Memories, Journey teaser, partners | Home-Desktop, Home-Mobile | Phase 1 |
| `/events` | Archive, tabs Local / International, type chips, year, search, sort, page numbers (?tab=&type=&year=&q=&page=) | EventsList(-Empty, -Loading, -Mobile…) | Phase 1 |
| `/events/[slug]` | Event detail, gallery + lightbox, video, Memories from this event, prev/next | EventDetail(-Mobile, -Minimal, -Ended), Lightbox | Phase 1 |
| `/upcoming` | Future events, soonest first, application status + deadline countdown | UpcomingList(-Empty, -Mobile…) | Phase 1 |
| `/upcoming/[slug]` | Detail + application form / external link / waitlist. After the end date: 301 → /events/[slug] | UpcomingDetail(-Mobile, -Mobile-Viewport), UpcomingStates | Phase 1 |
| `/journey` | Six steps, quotes, final CTA | Journey, Journey-Mobile, JourneyStates | Phase 1 |
| `/join` | Why join, who, steps, rules, documents, FAQ, membership form | JoinPage(-Mobile), JoinFormStates(-Mobile) | Phase 1 |
| `/partners` | For Companies: benefits, packages, logo wall, PDF, inquiry form | PartnersPage(-Mobile), PartnersStates(-Mobile) | Phase 1 |
| `/contact` | Form with subject routing, details, board e-mails, map, social, legal | ContactPage(-Mobile), ContactStates(-Mobile) | Phase 1 |
| `/privacy` | Privacy policy (rich text page from the admin; not designed, use the Contact page layout) | — | Phase 1 |
| `/members` | Board (per mandate), active members (search, team, year, page), alumni | MembersPage(-Member, -Empty, -Mobile…) | Phase 2 |
| `/members/[username]` | Public profile, or limited view + log-in prompt for members-only profiles | MemberProfile(-Mobile, -Restricted…) | Phase 2 |
| `/memories` | Cards, filters (event, year, city/country, author), search, page numbers. Map view later | MemoriesList(-Empty, -Mobile…), MemoriesList-Map (later) | Phase 2 |
| `/memories/[slug]` | Post: cover, rich text, gallery + lightbox, linked event, author, related, share | MemoryPost(-Mobile, -Former, -Preview, -ChangesWaiting), MemoryLightbox | Phase 2 |
| `/submit` | ?tab=idea (default) \| impression, &event=<slug> preselects the event | SubmitPage(-Impression, -Mobile…), SubmitStates | Phase 2 |
| `/login · /register · /forgot-password · /reset-password · /auth/confirm` | Member auth (same Supabase Auth as admins) | AuthPage(-Register, -Login-Mobile…), AuthStates | Phase 2 |

## Logged-in member

| Route | What | Canvas frames | Phase |
|---|---|---|---|
| `/profile` | My profile: profile, visibility, my applications, my Memories, privacy & consent (CV), account, delete | MyProfile(-Mobile), MyProfileStates | Phase 2 |
| `/memories/new` | Memory editor (draft, autosave, preview, submit) | MemoryEditor(-Mobile, -Errors) | Phase 2 |
| `/memories/[slug]/edit` | Edit: not approved → resubmit; published → changes go to review | MemoryEditor-Rejected, MemoryEditor-LiveEdit | Phase 2 |
| `/memories/[slug]?preview` | Author preview before approval | MemoryPost-Preview | Phase 2 |

## Admin (`/admin`, login required)

| Route | What | Canvas frames | Phase |
|---|---|---|---|
| `/admin/login` | Admin login, forgot password, 2-step | AdminLogin(-Mobile), AdminLoginStates | Phase 1 |
| `/admin` | Dashboard: counters, pending approvals, activity, quick actions | AdminDashboard(-Tablet), AdminMobileViews | Phase 1 |
| `/admin/approvals` | ?type=members\|memories\|applications · preview, approve, reject with reason | AdminApprovals, AdminDialogs | Phase 1 + 2 |
| `/admin/inbox` | ?tab=contact\|partners\|membership · read/unread, status, notes, CSV | AdminInbox | Phase 1 |
| `/admin/events · /new · /[id] · /types` | List (filters, bulk, pages) and edit form (all field types) | AdminEvents(-Empty), AdminEventEdit, AdminEditStates | Phase 1 |
| `/admin/applications` | ?event= · form builder per event, list, statuses, CSV/Excel, e-mail accepted | pattern: AdminEvents + AdminEventEdit | Phase 1 |
| `/admin/members` | Registrations, teams, roles, status, badges, board per mandate, alumni | pattern: list + edit form | Phase 2 |
| `/admin/memories` | Edit, unpublish, delete, feature on Home | pattern: list + edit form | Phase 2 |
| `/admin/ideas` | ?tab=ideas\|feedback\|ratings · statuses, owner, notes, form settings | AdminIdeas(-Feedback, -Ratings, -Settings) | Phase 2 |
| `/admin/pages/home · map · journey · join · sponsors · contact` | Page editors (sections, lists with drag-and-drop, visibility) | pattern: edit form | Phase 1 |
| `/admin/media` | All uploads, alt text, reuse | pattern: list | Phase 1 |
| `/admin/settings` | Branding, Events (72 h / 14 days / defaults), Contact & legal (+ board roles), SEO per page, E-mail notifications, Languages, Activity log, Security & backups | AdminSettings | Phase 1 |
| `/admin/users` | Admin users, invites, roles, permissions matrix | AdminUsers | Phase 1 |

Screens marked “pattern” were not drawn one by one: build them from the admin list, edit-form, approval and inbox patterns.
