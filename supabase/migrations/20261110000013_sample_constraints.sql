-- The design fixtures include intentionally incomplete published samples. Real content must satisfy
-- the publication rules; replacing a sample rechecks them when is_sample becomes false.
alter table public.events drop constraint events_check1;
alter table public.events add constraint events_publish_text_check check (
  is_sample or status = 'draft' or (length(trim(title->>'mk')) > 0 and length(trim(short_description->>'mk')) > 0 and length(trim(location->>'mk')) > 0)
);
alter table public.events drop constraint events_check2;
alter table public.events add constraint events_publish_cover_check check (
  is_sample or status = 'draft' or cover_media_id is null or nullif(trim(cover_alt),'') is not null
);
alter table public.events drop constraint events_check3;
alter table public.events add constraint events_publish_agenda_check check (is_sample or status = 'draft' or public.event_agenda_valid(agenda));
alter table public.events drop constraint events_check4;
alter table public.events add constraint events_publish_application_check check (
  is_sample or status = 'draft' or not applications_enabled or
  (apply_via = 'external' and length(trim(external_url)) > 0) or
  (apply_via = 'form' and deadline is not null and deadline <= ends_at and (opens_at is null or opens_at < deadline))
);
-- Sponsor alt text belongs to a board-editable use and is localized in the repository contract.
alter table public.sponsors alter column logo_alt type jsonb using
  case when logo_alt is null then null else jsonb_build_object('mk',logo_alt) end;
alter table public.sponsors add constraint sponsors_logo_alt_localized check (logo_alt is null or public.is_localized(logo_alt));
