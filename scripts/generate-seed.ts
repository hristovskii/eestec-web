// Deterministic SQL generated from the base fixtures. Run through Vitest to resolve aliases.
import { createHash } from 'node:crypto';

import { activityFixture } from '../src/features/activity/data/fixtures/activity';
import {
  applicationFormsFixture,
  applicationsFixture,
} from '../src/features/applications/data/fixtures/applications';
import { accountsFixture } from '../src/features/auth/data/fixtures/accounts';
import { registrationsFixture, memberAccountsFixture } from '../src/features/auth/data/fixtures/members';
import { personas } from '../src/features/auth/data/fixtures/personas';
import { committeesFixture } from '../src/features/committees/data/fixtures/committees';
import { contactFixture } from '../src/features/contact/data/fixtures/contact';
import { messagesFixture } from '../src/features/contact/data/fixtures/messages';
import {
  eventTopicsFixture,
  eventTypesFixture,
  eventsFixture,
} from '../src/features/events/data/fixtures/events';
import { homeFixture } from '../src/features/home/data/fixtures/home';
import { feedbackFixture } from '../src/features/ideas/data/fixtures/feedback';
import { formFixture } from '../src/features/ideas/data/fixtures/form';
import { ideasFixture } from '../src/features/ideas/data/fixtures/ideas';
import { joinFixture } from '../src/features/join/data/fixtures/join';
import { membershipFixture } from '../src/features/join/data/fixtures/membership';
import { journeyFixture } from '../src/features/journey/data/fixtures/journey';
import { mediaFixture } from '../src/features/media/data/fixtures/media';
import { mandatesFixture } from '../src/features/members/data/fixtures/board';
import { consentsFixture, cvsFixture } from '../src/features/members/data/fixtures/me';
import { profilesFixture } from '../src/features/members/data/fixtures/profiles';
import { badgesFixture, teamsFixture } from '../src/features/members/data/fixtures/teams';
import { memoriesFixture } from '../src/features/memories/data/fixtures/memories';
import { notesFixture } from '../src/features/notes/data/fixtures/notes';
import { inquiriesFixture } from '../src/features/partners/data/fixtures/inquiries';
import {
  partnersPageFixture,
  sponsorsFixture,
  tiersFixture,
} from '../src/features/partners/data/fixtures/partners';
import { settingsFixture } from '../src/features/settings/data/fixtures/settings';

// A fixed RFC 4122 namespace ensures fixture IDs are stable across machines and seed regenerations.
const namespace = Buffer.from('17e2a70f17da5b0e99c74a9d2d61f190', 'hex');
export function seedId(table: string, id: string): string {
  const hash = createHash('sha1').update(namespace).update(`${table}:${id}`).digest().subarray(0, 16);
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50;
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const aliases: Record<string, string> = {
  'u-filip': 'p-filip-angelovski',
  'u-teodora': 'p-teodora-mitreva',
  'u-sara': 'p-sara-dimova',
};
const userId = (id: string) => seedId('auth.users', aliases[id] ?? id);
const idOrNull = (table: string, id: string | null | undefined) => (id ? seedId(table, id) : null);
type SqlValue = string | number | boolean | null | { json: unknown } | { array: string[] };
const json = (value: unknown): SqlValue => ({ json: value });
const array = (value: string[]): SqlValue => ({ array: value });
const literal = (value: SqlValue): string => {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if ('array' in value) return `array[${value.array.map((item) => literal(item)).join(',')}]::text[]`;
  return `${literal(JSON.stringify(value.json))}::jsonb`;
};
const mapRefs = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(mapRefs);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === 'mediaId' && typeof item === 'string' ? seedId('media', item) : mapRefs(item),
    ]),
  );
};

export function generateSeed(): string {
  const statements = [
    '-- Generated from fixture data by scripts/generate-seed.ts. Do not edit by hand.',
    'begin;',
  ];
  const insert = (table: string, row: Record<string, SqlValue>) => {
    const entries = Object.entries(row);
    statements.push(
      `insert into ${table} (${entries.map(([key]) => key).join(', ')}) values (${entries.map(([, value]) => literal(value)).join(', ')});`,
    );
  };
  const userRows = new Map<string, { name: string; username: string; email: string }>();
  for (const profile of profilesFixture)
    userRows.set(profile.userId, { name: profile.name, username: profile.username, email: '' });
  for (const account of [...accountsFixture, ...memberAccountsFixture, ...personas])
    userRows.set(account.userId, { name: account.name, username: account.username, email: account.email });
  for (const registration of registrationsFixture) {
    if (!userRows.has(registration.userId))
      userRows.set(registration.userId, {
        name: registration.name,
        username: registration.userId,
        email: registration.email,
      });
  }
  for (const [id, user] of userRows) {
    const uid = userId(id);
    insert('auth.users', {
      id: uid,
      aud: 'authenticated',
      role: 'authenticated',
      // Never a real-looking address: a real person with the same e-mail must be able to register before the purge.
      email: `sample+${uid}@example.invalid`,
      email_confirmed_at: '2026-10-04T16:18:00Z',
      banned_until: '9999-12-31T00:00:00Z',
      raw_app_meta_data: json({ is_sample: true }),
      raw_user_meta_data: json({ name: user.name }),
    });
  }
  for (const profile of profilesFixture) {
    insert('public.profiles', {
      id: userId(profile.userId),
      username: profile.username,
      full_name: profile.name,
      bio: profile.bio,
      hide_photo: profile.hidePhoto,
      hide_bio: profile.hideBio,
      linkedin_url: profile.linkedinUrl,
      github_url: profile.githubUrl,
      visibility: profile.visibility,
      status: profile.status,
      member_since: profile.memberSince,
      active_to: profile.activeTo,
      alumni_now: profile.alumniNow ? json(profile.alumniNow) : null,
      alumni_highlight: profile.alumniHighlight ? json(profile.alumniHighlight) : null,
      is_sample: true,
    });
    const consent = consentsFixture[profile.userId];
    const cv = cvsFixture[profile.userId]?.info;
    insert('public.member_accounts', {
      profile_id: userId(profile.userId),
      faculty: profile.faculty,
      data_consent_at: '2026-10-04T16:18:00Z',
      newsletter_opt_in: consent?.newsletter ?? false,
      gallery_name_opt_in: consent?.galleryName ?? false,
      cv_opt_in: consent?.cvOptIn ?? false,
      cv_consent_at: consent?.cvConsentAt ?? null,
      cv_file_name: cv?.fileName ?? null,
      cv_size: cv?.size ?? null,
      cv_uploaded_at: cv?.uploadedAt ?? null,
      is_sample: true,
    });
  }
  for (const registration of registrationsFixture) {
    if (profilesFixture.some((profile) => profile.userId === registration.userId)) continue;
    const user = userRows.get(registration.userId);
    if (!user) throw new Error(`Missing sample account ${registration.userId}`);
    insert('public.profiles', {
      id: userId(registration.userId),
      username: user.username,
      full_name: registration.name,
      visibility: 'members_only',
      status: registration.status,
      is_sample: true,
    });
    insert('public.member_accounts', {
      profile_id: userId(registration.userId),
      faculty: registration.faculty,
      year_of_study: registration.year,
      phone: registration.phone,
      data_consent_at: registration.submittedAt,
      registration_locale: registration.locale,
      is_sample: true,
    });
  }
  for (const account of [...accountsFixture, ...personas]) {
    if (!account.adminRole) continue;
    if (
      [...accountsFixture, ...personas].findIndex(
        (other) => other.userId === account.userId && other.adminRole,
      ) !== [...accountsFixture, ...personas].indexOf(account)
    )
      continue;
    insert('public.admin_roles', {
      user_id: userId(account.userId),
      role: account.adminRole,
      display_name: account.name,
      is_sample: true,
    });
  }
  for (const item of mediaFixture) {
    const brand = item.src?.startsWith('/brand/') ?? false;
    insert('public.media', {
      id: seedId('media', item.id),
      bucket: item.kind === 'image' ? 'public-media' : 'documents',
      public_path: item.src,
      kind: item.kind,
      file_name: item.fileName,
      mime_type: item.mimeType,
      size_bytes: item.size,
      width: item.width ?? null,
      height: item.height ?? null,
      alt_text: item.alt,
      credit: item.credit ?? null,
      sample_caption: item.src ? null : (item.sampleCaption ?? item.fileName),
      uploaded_by: brand ? null : userId(item.uploadedBy.userId),
      is_sample: !brand,
      created_at: item.uploadedAt,
    });
  }
  for (const profile of profilesFixture) {
    if (!profile.photo) continue;
    const photoId = seedId('media', `profile:${profile.userId}`);
    insert('public.media', {
      id: photoId,
      bucket: 'avatars',
      kind: 'image',
      file_name: profile.username,
      sample_caption: profile.name,
      is_sample: true,
    });
    statements.push(
      `update public.profiles set photo_media_id = ${literal(photoId)} where id = ${literal(userId(profile.userId))};`,
    );
  }
  for (const team of teamsFixture)
    insert('public.teams', {
      id: seedId('teams', team.id),
      slug: team.slug,
      name: json(team.name),
      sort_order: team.sortOrder,
      is_sample: true,
    });
  for (const badge of badgesFixture)
    insert('public.badges', {
      id: seedId('badges', badge.id),
      name: json(badge.name),
      description: json(badge.description),
      icon: badge.icon,
      is_sample: true,
    });
  for (const profile of profilesFixture) {
    for (const team of profile.teams)
      insert('public.member_teams', {
        profile_id: userId(profile.userId),
        team_id: seedId('teams', team.teamId),
        role: team.role,
      });
    for (const badge of profile.badges)
      insert('public.member_badges', {
        profile_id: userId(profile.userId),
        badge_id: seedId('badges', badge.badgeId),
        note: badge.note,
        awarded_at: badge.awardedAt,
      });
  }
  for (const [index, role] of settingsFixture.boardRoles.entries())
    insert('public.board_roles', {
      id: seedId('board_roles', role.id),
      key: role.id.replace(/^role-/, ''),
      title: role.title,
      email: role.email,
      sort_order: index,
      is_sample: true,
    });
  for (const mandate of mandatesFixture) {
    insert('public.board_mandates', {
      id: seedId('board_mandates', mandate.id),
      label: mandate.label,
      starts_on: mandate.startsOn,
      ends_on: mandate.endsOn,
      is_current: mandate.isCurrent,
      is_sample: true,
    });
    for (const [index, seat] of mandate.seats.entries())
      insert('public.board_members', {
        id: seedId('board_members', seat.id),
        mandate_id: seedId('board_mandates', mandate.id),
        board_role_id: seedId('board_roles', seat.boardRoleId),
        role_title_snapshot: seat.title,
        profile_id: userId(seat.userId),
        sort_order: index,
        is_sample: true,
      });
  }
  for (const [index, type] of eventTypesFixture.entries())
    insert('public.event_types', {
      id: seedId('event_types', type.id),
      name: json(type.name),
      sort_order: index,
      is_sample: true,
    });
  for (const [index, topic] of eventTopicsFixture.entries())
    insert('public.event_topics', {
      id: seedId('event_topics', topic.id),
      name: json(topic.name),
      sort_order: index,
      is_sample: true,
    });
  for (const [index, tier] of tiersFixture.entries())
    insert('public.sponsor_tiers', {
      id: seedId('sponsor_tiers', tier.id),
      name: json(tier.name),
      size: tier.size,
      sort_order: index,
      is_sample: true,
    });
  for (const [index, sponsor] of sponsorsFixture.entries())
    insert('public.sponsors', {
      id: seedId('sponsors', sponsor.id),
      name: sponsor.name,
      logo_media_id: idOrNull('media', sponsor.logo?.mediaId),
      logo_alt: sponsor.logo ? json(sponsor.logo.alt) : null,
      website_url: sponsor.websiteUrl,
      tier_id: seedId('sponsor_tiers', sponsor.tierId),
      active_from: sponsor.activeFrom || null,
      active_to: sponsor.activeTo || null,
      is_active: sponsor.isActive,
      sort_order: index,
      is_sample: true,
    });
  for (const [index, item] of partnersPageFixture.packages.items.entries())
    insert('public.partner_packages', {
      id: seedId('partner_packages', item.id),
      name: json(item.name),
      text: json(item.text),
      price_text: json(item.priceText),
      items: json(item.items),
      highlighted: item.highlighted,
      cta: json(item.cta),
      sort_order: index,
      is_sample: true,
    });
  for (const event of eventsFixture) {
    insert('public.events', {
      id: seedId('events', event.id),
      slug: event.slug,
      title: json(event.title),
      short_description: json(event.shortDescription),
      scope: event.scope,
      type_id: seedId('event_types', event.typeId),
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      all_day: event.allDay,
      location: json(event.location),
      city: json(event.city),
      country: json(event.country),
      organizer: event.organizer,
      description: json(event.description),
      agenda: json(event.agenda),
      requirements: json(event.requirements),
      fee: json(event.fee),
      contact_email: event.contactEmail,
      participant_count: event.participantCount,
      country_count: event.countryCount,
      cover_media_id: idOrNull('media', event.cover?.mediaId),
      cover_alt: event.cover?.alt ?? null,
      cover_credit: event.cover?.credit ?? null,
      info_pack_id: idOrNull('media', event.infoPackId),
      video_url: event.videoUrl,
      status: event.status,
      publish_at: event.publishAt,
      next_up: event.nextUp,
      applications_enabled: event.applications.enabled,
      apply_via: event.applications.via,
      external_url: event.applications.externalUrl,
      opens_at: event.applications.opensAt,
      deadline: event.applications.deadline,
      results_on: event.applications.resultsOn,
      max_participants: event.applications.maxParticipants,
      waitlist: event.applications.waitlist,
      admission: event.applications.admission,
      seo_title: json(event.seo.title),
      seo_description: json(event.seo.description),
      seo_share_media_id: idOrNull('media', event.seo.shareImageId),
      updated_by: userId(event.updatedBy.userId),
      created_at: event.createdAt,
      updated_at: event.updatedAt,
      is_sample: true,
    });
    for (const topic of event.topicIds)
      insert('public.event_topic_links', {
        event_id: seedId('events', event.id),
        topic_id: seedId('event_topics', topic),
      });
    for (const [index, photo] of event.gallery.entries())
      insert('public.event_gallery', {
        id: seedId('event_gallery', `${event.id}:${index}`),
        event_id: seedId('events', event.id),
        media_id: seedId('media', photo.mediaId),
        alt: photo.alt,
        credit: photo.credit ?? null,
        sort_order: index,
        is_sample: true,
      });
    for (const [index, partner] of event.partnerIds.entries())
      insert('public.event_partners', {
        event_id: seedId('events', event.id),
        sponsor_id: seedId('sponsors', partner),
        sort_order: index,
      });
  }
  const managers = new Set<string>();
  for (const person of [...accountsFixture, ...personas])
    for (const eventId of person.managedEventIds) {
      const key = `${eventId}:${person.userId}`;
      if (managers.has(key)) continue;
      managers.add(key);
      insert('public.event_managers', {
        event_id: seedId('events', eventId),
        user_id: userId(person.userId),
      });
    }
  for (const committee of committeesFixture)
    insert('public.committees', {
      id: seedId('committees', committee.id),
      name: committee.name,
      city: json(committee.city),
      country: committee.country,
      status: committee.status,
      lat: committee.lat,
      lng: committee.lng,
      url: committee.url,
      is_home: committee.isHome,
      is_sample: true,
    });
  for (const [page, content] of Object.entries({
    home: homeFixture,
    journey: journeyFixture,
    join: joinFixture,
    partners: partnersPageFixture,
    contact: { ...contactFixture, subjects: undefined },
    submit: { intro: formFixture.intro },
  }))
    insert('public.page_content', { page, content: json(mapRefs(content)), is_sample: true });
  for (const [key, value] of Object.entries({
    siteName: settingsFixture.siteName,
    footerTagline: settingsFixture.footerTagline,
    branding: settingsFixture.branding,
    contact: settingsFixture.contact,
    weeklyMeeting: settingsFixture.weeklyMeeting,
    legal: settingsFixture.legal,
    events: settingsFixture.events,
    retentionMonths: settingsFixture.retentionMonths,
    notifications: settingsFixture.notifications,
    privacy: settingsFixture.privacy,
  }))
    insert('public.site_settings', { key, value: json(mapRefs(value)), is_sample: true });
  for (const [page, seo] of Object.entries(settingsFixture.seo))
    insert('public.seo_pages', {
      page,
      title: json(seo.title),
      description: json(seo.description),
      share_media_id: idOrNull('media', seo.shareImage?.mediaId),
      share_alt: seo.shareImage?.alt ?? null,
      is_sample: true,
    });
  for (const [index, link] of settingsFixture.socialLinks.entries())
    insert('public.social_links', {
      id: seedId('social_links', link.platform),
      platform: link.platform,
      handle: link.handle,
      url: link.url,
      sort_order: index,
      is_sample: true,
    });
  for (const [index, subject] of contactFixture.subjects.entries()) {
    insert('public.contact_subjects', {
      id: seedId('contact_subjects', subject.id),
      name: json(subject.name),
      team_label: json(subject.teamLabel),
      route_note: json(subject.routeNote),
      shortcut_label: json(subject.shortcutLabel),
      shortcut_url: subject.shortcutUrl,
      sort_order: index,
      is_sample: true,
    });
    insert('public.contact_subject_routes', {
      subject_id: seedId('contact_subjects', subject.id),
      route_email: subject.routeEmail,
      is_sample: true,
    });
  }
  for (const form of applicationFormsFixture)
    insert('public.application_forms', {
      event_id: seedId('events', form.eventId),
      intro: json(form.intro),
      fields: json(form.fields),
      is_sample: true,
    });
  for (const app of applicationsFixture)
    insert('public.applications', {
      id: seedId('applications', app.id),
      event_id: seedId('events', app.eventId),
      reference: app.reference,
      name: app.name,
      email: app.email,
      answers: json(app.answers),
      status: app.status,
      waitlist_position: app.waitlistPosition,
      locale: app.locale,
      consent_at: app.consentAt,
      read_at: app.readAt,
      created_at: app.createdAt,
      is_sample: true,
    });
  for (const message of messagesFixture)
    insert('public.contact_messages', {
      id: seedId('contact_messages', message.id),
      reference: message.reference,
      name: message.name,
      email: message.email,
      subject_id: idOrNull('contact_subjects', message.subjectId),
      subject: message.subject,
      routed_to: message.routedTo,
      message: message.message,
      locale: message.locale,
      status: message.status,
      read_at: message.readAt,
      consent_at: message.consentAt,
      created_at: message.createdAt,
      is_sample: true,
    });
  for (const inquiry of inquiriesFixture)
    insert('public.partner_inquiries', {
      id: seedId('partner_inquiries', inquiry.id),
      reference: inquiry.reference,
      company: inquiry.company,
      contact_person: inquiry.contactPerson,
      email: inquiry.email,
      phone: inquiry.phone,
      interests: array(inquiry.interests),
      message: inquiry.message,
      locale: inquiry.locale,
      status: inquiry.status,
      read_at: inquiry.readAt,
      consent_at: inquiry.consentAt,
      created_at: inquiry.createdAt,
      is_sample: true,
    });
  for (const [index, item] of membershipFixture.entries())
    insert('public.membership_applications', {
      id: seedId('membership_applications', item.id),
      reference: `MEM-2026-${String(index + 1).padStart(4, '0')}`,
      name: item.name,
      email: item.email,
      phone: item.phone,
      faculty: item.faculty,
      study_program: item.studyProgram,
      year_of_study: item.yearOfStudy,
      interests: array(item.interests),
      heard_from: item.heardFrom,
      locale: item.locale,
      status: item.status,
      read_at: item.readAt,
      consent_at: item.consentAt,
      created_at: item.createdAt,
      is_sample: true,
    });
  for (const [index, type] of formFixture.types.entries())
    insert('public.idea_types', {
      id: seedId('idea_types', type.id),
      name: json(type.name),
      sort_order: index,
      is_sample: true,
    });
  for (const memory of memoriesFixture) {
    const content = memory.content;
    insert('public.memories', {
      id: seedId('memories', memory.id),
      author_id: memory.authorId ? userId(memory.authorId) : null,
      author_deleted: memory.authorDeleted,
      slug: memory.slug,
      status: memory.status,
      source: memory.source,
      title: content.title,
      body: content.body,
      event_id: idOrNull('events', content.eventId),
      other_event_name: content.otherEventName,
      city: content.city,
      country: content.country,
      happened_on: content.happenedOn,
      cover_media_id: idOrNull('media', content.cover?.fileId),
      cover_sample: content.cover?.sample ?? null,
      cover_alt: content.cover?.alt ?? null,
      cover_credit: content.cover?.credit ?? null,
      featured_on_home: memory.featuredOnHome,
      rejection_reason: memory.rejectionReason,
      reviewed_by_name: memory.reviewedByName,
      reviewed_at: memory.reviewedAt,
      submitted_at: memory.submittedAt,
      published_at: memory.publishedAt,
      reads_count: memory.readsCount,
      created_at: memory.createdAt,
      updated_at: memory.updatedAt,
      is_sample: true,
    });
    for (const [index, photo] of content.photos.entries())
      insert('public.memory_photos', {
        id: seedId('memory_photos', photo.id),
        memory_id: seedId('memories', memory.id),
        media_id: idOrNull('media', photo.fileId),
        sample_caption: photo.sample,
        alt: photo.alt,
        caption: photo.caption,
        sort_order: index,
        is_sample: true,
      });
    if (memory.revision) {
      const revision = memory.revision;
      insert('public.memory_revisions', {
        id: seedId('memory_revisions', revision.id),
        memory_id: seedId('memories', memory.id),
        status: revision.status,
        content: json({
          ...revision.content,
          eventId: idOrNull('events', revision.content.eventId),
          photos: undefined,
        }),
        reason: revision.reason,
        reviewed_by_name: revision.reviewedByName,
        reviewed_at: revision.reviewedAt,
        submitted_at: revision.submittedAt,
        is_sample: true,
      });
      for (const [index, photo] of revision.content.photos.entries())
        insert('public.memory_revision_photos', {
          id: seedId('memory_revision_photos', `${revision.id}:${photo.id}`),
          revision_id: seedId('memory_revisions', revision.id),
          media_id: idOrNull('media', photo.fileId),
          sample_caption: photo.sample,
          alt: photo.alt,
          caption: photo.caption,
          sort_order: index,
          is_sample: true,
        });
    }
  }
  for (const [index, idea] of ideasFixture.entries()) {
    insert('public.ideas', {
      id: seedId('ideas', idea.id),
      reference: `IDE-2026-${String(index + 1).padStart(4, '0')}`,
      type_id: seedId('idea_types', idea.typeId),
      title: idea.title,
      description: idea.description,
      name: idea.name,
      email: idea.email,
      user_id: idea.userId ? userId(idea.userId) : null,
      is_anonymous: idea.isAnonymous,
      consent_at: idea.consentAt,
      locale: idea.locale,
      status: idea.status,
      owner_id: idea.ownerId ? userId(idea.ownerId) : null,
      owner_name: idea.ownerName,
      event_draft_id: idOrNull('events', idea.eventDraftId),
      created_at: idea.createdAt,
      is_sample: true,
    });
    if (idea.attachment)
      insert('public.submission_files', {
        id: seedId('submission_files', idea.attachment.id),
        idea_id: seedId('ideas', idea.id),
        path: `sample/${idea.attachment.id}`,
        file_name: idea.attachment.name,
        mime_type: idea.attachment.mime,
        size_bytes: idea.attachment.size,
        is_sample: true,
      });
  }
  for (const [index, item] of feedbackFixture.entries()) {
    insert('public.feedback', {
      id: seedId('feedback', item.id),
      reference: `FDB-2026-${String(index + 1).padStart(4, '0')}`,
      event_id: idOrNull('events', item.eventId),
      other_event_name: item.otherEventName,
      event_title: item.eventTitle,
      rating: item.rating,
      impression: item.text,
      name: item.name,
      email: item.email,
      user_id: item.userId ? userId(item.userId) : null,
      is_anonymous: item.isAnonymous,
      consent_at: item.consentAt,
      locale: item.locale,
      status: item.status,
      owner_id: item.ownerId ? userId(item.ownerId) : null,
      owner_name: item.ownerName,
      memory_id: idOrNull('memories', item.memoryId),
      created_at: item.createdAt,
      is_sample: true,
    });
    for (const [position, photo] of item.photos.entries())
      insert('public.submission_files', {
        id: seedId('submission_files', photo.id),
        feedback_id: seedId('feedback', item.id),
        path: `sample/${photo.id}`,
        file_name: photo.name,
        mime_type: photo.mime,
        size_bytes: photo.size,
        sort_order: position,
        is_sample: true,
      });
  }
  const noteTables = {
    contact_message: 'contact_messages',
    partner_inquiry: 'partner_inquiries',
    membership_application: 'membership_applications',
    idea: 'ideas',
    feedback: 'feedback',
  } as const;
  for (const note of notesFixture)
    insert('public.internal_notes', {
      id: seedId('internal_notes', note.id),
      entity_type: note.entityType,
      entity_id: seedId(noteTables[note.entityType], note.entityId),
      author: note.authorId ? userId(note.authorId) : null,
      author_name: note.authorName,
      author_initials: note.authorInitials,
      body: note.body,
      created_at: note.createdAt,
      is_sample: true,
    });
  for (const activity of activityFixture)
    insert('public.activity_log', {
      id: seedId('activity_log', activity.id),
      actor: activity.actor ? userId(activity.actor.userId) : null,
      actor_name: activity.actor?.name ?? null,
      actor_initials: activity.actor?.initials ?? null,
      action: activity.action,
      area: activity.area,
      target: activity.target,
      href: activity.href ?? null,
      created_at: activity.at,
      is_sample: true,
    });
  statements.push(`insert into public.reference_counters(kind, year, last)
    select 'application:' || split_part(reference,'-',1), split_part(reference,'-',2)::integer, max(split_part(reference,'-',3)::integer)
    from public.applications where is_sample group by 1,2;`);
  statements.push(`insert into public.reference_counters(kind, year, last) values
    ('contact',2026,${Math.max(...messagesFixture.map((m) => Number(m.reference.split('-')[2])))}),
    ('partner',2026,${Math.max(...inquiriesFixture.map((m) => Number(m.reference.split('-')[2])))}),
    ('membership',2026,${membershipFixture.length}),('idea',2026,${ideasFixture.length}),('feedback',2026,${feedbackFixture.length});`);
  statements.push('commit;');
  return `${statements.join('\n')}\n`;
}
