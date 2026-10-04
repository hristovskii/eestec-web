# Shared components

Build once, reuse everywhere, never restyle per page.

| Component | Variants / props / states | Used on | Canvas frames |
|---|---|---|---|
| Header | variant desktop \| mobile \| mobile-open · active page · auth guest \| member \| member-menu · admin flag (adds “Admin panel”) | every public page | Header, HeaderStates |
| Footer | desktop \| mobile · red, white logo, contacts, social, legal, links | every public page | Footer |
| EventCard | kind event \| memory · status badge (open, closing, soon, closed, full, ended) · deadline · organized badge · loading skeleton · hover | Home, Events, Upcoming, event detail, Memories, profiles | EventCard |
| MemberCard | member \| board \| board-row (mobile) \| alumni · no-photo initials · members-only badge · compact | Members, Home (board) | MemberCard, MemberCardStates |
| CommitteeMap | pins LC / Observer / JLC, LC Skopje highlighted, popup, legend, compact | Home | CommitteeMap |
| ApplyBox | application status, deadline countdown, apply / waitlist / closed / full / external | Upcoming detail | ApplyBox, UpcomingStates |
| JourneyStep | collapsed / hover (highlight only) / expanded (click) | Journey, Home teaser | JourneyStep, JourneyStates |
| PartnerLogo / PartnerLogos | logo sized by visual area; grey → colour on hover; tiers; empty tier hidden; home \| wall \| past | Home, For Companies | PartnerLogo, PartnerLogos |
| Lightbox | title, caption, index, count · desktop \| mobile (swipe) | Event and Memory galleries | Lightbox, MemoryLightbox |
| Forms: JoinForm, CompanyForm, ContactForm, AuthForm, SubmitForm | one field style: label above, help, error, red focus ring; states empty, filled, errors (summary + inline), sending, success, closed / limited | Join, For Companies, Contact, auth, /submit | *FormStates, AuthStates, SubmitStates |
| Section title | H2 + 56×4 red bar | all pages | Main |
| Breadcrumbs, tabs, filter chips, page numbers, empty state, toasts, dialogs | same markup on every list page | lists | Main, EventsList, MembersPage, MemoriesList |
| AdminSidebar / AdminTopbar | sections + red counts, rail (tablet), drawer (mobile) · breadcrumbs, search, user + role | every admin screen | AdminSidebar, AdminTopbar, AdminMobile |
| Admin patterns | list/table (search, filters, bulk, pages, empty), edit form (save bar: no changes / unsaved / saving / published-edited), validation, toasts, approval card, inbox, dialogs (delete = type DELETE) | every admin section | AdminEvents, AdminEventEdit, AdminEditStates, AdminApprovals, AdminInbox, AdminDialogs |