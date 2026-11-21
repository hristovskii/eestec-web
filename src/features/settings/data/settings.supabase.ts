import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { DataError, unwrap } from '@/shared/data/supabase/errors';
import { toJson } from '@/shared/data/supabase/json';
import { mediaSource } from '@/shared/data/supabase/media-source';
import type { Localized } from '@/shared/types/localized';

import { toPrivacyPolicy, toResolvedSeo, toSiteSettings } from '../domain/resolve';
import {
  type ImageAsset,
  type NotificationKind,
  type NotificationSetting,
  type PageSeo,
  type PrivacyRecord,
  SEO_PAGES,
  type SeoPageKey,
  type SettingsRecord,
  type SocialLink,
} from '../types';
import type { SettingsRepository } from './settings.repository';

const EMPTY_SEO: PageSeo = { title: { mk: '' }, description: { mk: '' }, shareImage: null };
const NO_NOTIFICATIONS = {
  contactMessages: { enabled: false, recipients: [] },
  partnerInquiries: { enabled: false, recipients: [] },
  membershipApplications: { enabled: false, recipients: [] },
  eventApplications: { enabled: false, recipients: [] },
  memberRegistrations: { enabled: false, recipients: [] },
  memoriesToApprove: { enabled: false, recipients: [] },
  ideasAndFeedback: { enabled: false, recipients: [] },
} satisfies Record<NotificationKind, NotificationSetting>;

/**
 * Settings are four tables (M19b): `site_settings` (one jsonb value per key), `board_roles`, `social_links`
 * and `seo_pages`. Everyone reads the public keys; the notification recipients are readable by a super
 * admin only (anyone else gets "nobody", which only the Settings page and the mailer ever look at). `save` is
 * one call (`save_site_settings`), super admin with 2-step; the privacy text is the one key an editor may write.
 */
export function createSupabaseSettingsRepository(client: DbClient): SettingsRepository {
  async function readRecord(): Promise<SettingsRecord> {
    const [settings, roles, links, seoRows] = await Promise.all([
      client.from('site_settings').select('key, value'),
      client.from('board_roles').select('id, title, email').order('sort_order'),
      client.from('social_links').select('platform, handle, url').order('sort_order'),
      client.from('seo_pages').select('*'),
    ]);
    const values = new Map(unwrap(settings).map((row) => [row.key, row.value]));
    const need = <T>(key: string): T => {
      if (!values.has(key)) throw new DataError('not_found', `Setting "${key}" is missing`);
      return values.get(key) as T;
    };

    const rows = unwrap(seoRows);
    const mediaIds = rows.map((row) => row.share_media_id).filter((id): id is string => !!id);
    const media = mediaIds.length
      ? unwrap(
          await client
            .from('media')
            .select('id, file_name, width, height, bucket, path, public_path')
            .in('id', mediaIds),
        )
      : [];
    const mediaById = new Map(media.map((row) => [row.id, row]));
    const seo = Object.fromEntries(SEO_PAGES.map((page) => [page, EMPTY_SEO])) as Record<SeoPageKey, PageSeo>;
    for (const row of rows) {
      if (!(SEO_PAGES as readonly string[]).includes(row.page)) continue;
      const file = row.share_media_id ? mediaById.get(row.share_media_id) : undefined;
      const shareImage: ImageAsset | null =
        row.share_media_id && file
          ? {
              mediaId: row.share_media_id,
              src: mediaSource(client, file) ?? '',
              fileName: file.file_name,
              width: file.width ?? 0,
              height: file.height ?? 0,
              alt: row.share_alt ?? '',
            }
          : null;
      seo[row.page as SeoPageKey] = {
        title: row.title as Localized,
        description: row.description as Localized,
        shareImage,
      };
    }

    return {
      siteName: need('siteName'),
      footerTagline: need('footerTagline'),
      branding: need('branding'),
      contact: need('contact'),
      weeklyMeeting: need('weeklyMeeting'),
      boardRoles: unwrap(roles).map((role) => ({ id: role.id, title: role.title, email: role.email ?? '' })),
      socialLinks: unwrap(links).map((link) => link as SocialLink),
      legal: need('legal'),
      events: need('events'),
      retentionMonths: need('retentionMonths'),
      seo,
      notifications: values.has('notifications') ? need('notifications') : NO_NOTIFICATIONS,
      privacy: need<PrivacyRecord>('privacy'),
    };
  }

  return {
    async getSiteSettings({ locale, now }) {
      return toSiteSettings(await readRecord(), locale, now);
    },

    async getPrivacyPolicy({ locale }) {
      const row = unwrap(await client.from('site_settings').select('value').eq('key', 'privacy').single());
      return toPrivacyPolicy(row.value as PrivacyRecord, locale);
    },

    async getPageSeo({ page, locale }) {
      return toResolvedSeo((await readRecord()).seo[page], locale);
    },

    getRecord: readRecord,

    async save(input) {
      const payload = {
        settings: {
          siteName: input.siteName,
          footerTagline: input.footerTagline,
          branding: input.branding,
          contact: input.contact,
          weeklyMeeting: input.weeklyMeeting,
          legal: input.legal,
          events: input.events,
          retentionMonths: input.retentionMonths,
          notifications: input.notifications,
        },
        board_roles: input.boardRoles,
        social_links: input.socialLinks,
        seo: Object.fromEntries(
          Object.entries(input.seo).map(([page, seo]) => [
            page,
            {
              title: seo.title,
              description: seo.description,
              share_media_id: seo.shareImage?.mediaId ?? null,
              share_alt: seo.shareImage?.alt ?? null,
            },
          ]),
        ),
      };
      unwrap(await client.rpc('save_site_settings', { p_data: toJson(payload) }));
      return readRecord();
    },

    async savePrivacy(input) {
      const row = unwrap(
        await client
          .from('site_settings')
          .update({ value: toJson(input) })
          .eq('key', 'privacy')
          .select('value')
          .single(),
      );
      return row.value as PrivacyRecord;
    },
  };
}
