# Data model (Supabase)

A starting point derived from every page and admin screen. Names are suggestions; keep the statuses and rules exactly. Every table: `id uuid primary key default gen_random_uuid()`, `created_at`, `updated_at`, RLS on. A draft SQL version is in `../supabase/schema.sql`.


## People & access

| Table | Fields | Notes / access |
|---|---|---|
| `profiles` | id (= auth.users.id), username (unique slug), full_name, photo_media_id, bio, faculty, year_of_study, phone, linkedin_url, github_url, visibility (public \| members_only, default members_only), status (pending \| active \| alumni \| inactive \| rejected \| hidden), member_since, active_from, active_to, alumni_now, alumni_highlight, data_consent_at, newsletter_opt_in, gallery_name_opt_in, cv_opt_in (default false), cv_consent_at, cv_path, approved_by, approved_at, created_at | RLS: public rows only when visibility=public and status in (active, alumni); members see members_only too; owner edits own row (not status/team/role). |
| `admin_roles` | user_id, role (super_admin \| editor \| event_manager), invited_by, created_at | No row = member. Super admins must have MFA (Supabase MFA). |
| `event_managers` | user_id, event_id | What an event manager may edit. |
| `teams · member_teams` | teams: id, name, slug, sort_order · member_teams: profile_id, team_id, role_in_team (member \| lead \| trainer) |  |
| `badges · member_badges` | badges: id, name, description, icon · member_badges: profile_id, badge_id, note, awarded_at |  |
| `board_roles` | id, title, email, sort_order | Also used on /contact and in the footer. |
| `board_mandates · board_members` | mandates: id, label (2026/2027), starts_on, ends_on, is_current · members: mandate_id, board_role_id, role_title_snapshot, profile_id, sort_order | Past boards show titles without e-mails. |
| `login_attempts` | email, ip_hash, succeeded, created_at | For the 15-minute lockout (or use Supabase rate limits). |

## Events & applications

| Table | Fields | Notes / access |
|---|---|---|
| `event_types` | id, name, sort_order | Editable list. |
| `events` | id, slug, title, category (local \| international), type_id, topics text[], starts_at, ends_at, all_day, location, city, country, organizing_committee, organized_by_lc bool, short_description, description (rich), agenda (rich), requirements (rich), fee_text, cover_media_id, cover_alt, video_url, info_pdf_media_id, participant_count, status (draft \| published \| hidden), publish_at, next_up bool, applications_enabled, apply_via (form \| external), external_url, applications_open_at, application_deadline, max_participants, waitlist_enabled, seo_title, seo_description, created_by, updated_by, timestamps | Upcoming vs past is computed from ends_at. Old slugs → slug_redirects. |
| `event_gallery` | event_id, media_id, caption, sort_order |  |
| `event_partners` | event_id, sponsor_id |  |
| `application_forms` | event_id, fields jsonb [{key, label, type: text \| long_text \| select \| checkbox \| file, required, options}] | Form builder per event. |
| `applications` | id, event_id, profile_id (nullable), name, email, answers jsonb, cv_path, status (pending \| accepted \| rejected \| waitlist), waitlist_position, consent_at, created_at | Event managers see only their events. CSV/Excel export. |
| `slug_redirects` | from_path, to_path, status_code (301) | Plus middleware: ended /upcoming/[slug] → /events/[slug]. |

## Memories

| Table | Fields | Notes / access |
|---|---|---|
| `memories` | id, slug, author_id (nullable after account deletion), author_deleted bool, title, event_id (nullable), other_event_name, city, country, lat, lng (later: map), happened_on, body (rich), cover_media_id, cover_alt, cover_credit, status (draft \| pending \| published \| rejected), rejection_reason, reviewed_by, reviewed_at, published_at, featured_on_home, source (editor \| impression), reads_count, timestamps | Public only when published. Former members: render “A former member”. |
| `memory_photos` | memory_id, media_id, caption, alt, sort_order |  |
| `memory_revisions` | id, memory_id, data jsonb (title, body, cover, photos), status (pending \| approved \| rejected), reason, submitted_at, reviewed_by, reviewed_at | Edits to a published Memory; live row unchanged until approved. |

## Ideas, feedback & inboxes

| Table | Fields | Notes / access |
|---|---|---|
| `idea_types` | id, name, sort_order | Editable in Ideas › Form settings. |
| `ideas` | id, type_id, title, description, attachment_media_id, name, email, consent_at, is_anonymous, profile_id (null when anonymous), status (new \| under_review \| accepted \| archived), owner_id, event_draft_id, created_at | Anonymous: name, e-mail, profile_id all null. |
| `feedback` | id, event_id (nullable), other_event_name, rating 1–5 (nullable), text, name, email, consent_at, profile_id, memory_id (if turned into a Memory), status (same four), created_at | Never public. Ratings view = avg/spread per event. |
| `feedback_photos` | feedback_id, media_id |  |
| `membership_applications` | id, name, email, phone, faculty, study_program, year_of_study, interests text[], heard_from, consent_at, status (new \| contacted \| accepted \| rejected), created_at | From /join. |
| `contact_subjects · contact_messages` | subjects: id, name, route_email, shortcut_url, sort_order · messages: id, name, email, subject_id, message, consent_at, status (new \| answered \| archived), read_at, created_at | Sender gets a copy. |
| `partner_inquiries` | id, company, contact_person, email, phone, interest (sponsorship \| workshop \| job_fair \| other), message, consent_at, status (new \| in_progress \| done), created_at | From /partners. |
| `internal_notes` | id, entity_type, entity_id, author_id, body, created_at | Shared by inbox, ideas, feedback, applications. |
| `submission_log` | form, ip_hash, created_at | Rate limit (5/hour on /submit) and spam checks. Delete after 30 days. |

## Sponsors

| Table | Fields | Notes / access |
|---|---|---|
| `sponsor_tiers` | id, name, sort_order, size_weight | Empty tier hidden everywhere. |
| `sponsors` | id, name, logo_media_id, website_url, tier_id, active_from, active_to, sort_order, is_active | active_to in the past → Past partners. |
| `partner_packages` | id, name, price_text, items jsonb, highlighted, sort_order | Plus single collaborations list. |
| `cv_access_log` | partner_user_id / sponsor_id, profile_id, viewed_at | Count shown to the member. |

## Site content & settings

| Table | Fields | Notes / access |
|---|---|---|
| `site_settings` | key, value jsonb, updated_by, updated_at | All settings in the table above. |
| `page_blocks` | page (home \| journey \| join \| partners \| contact \| submit \| privacy), key, value jsonb (texts, images, buttons), is_visible, sort_order | Hero, intros, section order/visibility, CTA texts. |
| `home_activities · timeline_milestones · home_stats` | activities: icon, title, text, sort · milestones: year, title, text, media_id, sort · stats: label, value, sort |  |
| `committees` | id, name, city, country, status (LC \| Observer \| JLC), lat, lng, url, is_home | Or synced from an eestec.net API if one exists. |
| `journey_steps · journey_quotes` | steps: icon, title, short_text, bullets text[], media_id, button_label, button_url, sort · quotes: text, author_name, profile_id, step_id |  |
| `join_benefits · join_steps · join_rules · faq_items · documents` | icon/title/text/sort · rules: title, body (rich), sort · faq: question, answer, sort · documents: title, media_id (PDF), sort | Plus applications_open flag + next-round text in page_blocks. |
| `social_links` | platform, handle, url, sort_order |  |
| `seo_pages` | path, title, description, share_media_id |  |
| `media` | id, bucket, path, mime, size, width, height, alt_text, credit, uploaded_by, created_at | Thumbnails generated on upload; images compressed. |
| `activity_log` | id, actor_id, action, entity_type, entity_id, summary, created_at | Admin › Settings › Activity log. |

## Storage buckets

| Bucket | Access | Contents |
|---|---|---|
| `public-media` | public | Event covers & galleries, Memory photos, logos, page images (compressed + thumbnails). |
| `documents` | public | Statute, rules, partnership PDF, event info packs. |
| `cvs` | private | Member CVs (opt-in) and application CVs. Signed URLs only; Main-package partners + admins. |
| `submissions` | private | Idea attachments, feedback photos until approved. |