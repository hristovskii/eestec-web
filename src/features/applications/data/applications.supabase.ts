import 'server-only';

import type { DbClient } from '@/shared/data/supabase/clients';
import { DataError, unwrap, unwrapMaybe } from '@/shared/data/supabase/errors';
import { isUuid } from '@/shared/data/supabase/ids';
import { toJson } from '@/shared/data/supabase/json';
import type { Localized } from '@/shared/types/localized';

import { listApplicationRows } from '../domain/application-list';
import type {
  AnswerValue,
  Application,
  ApplicationFile,
  ApplicationField,
  ApplicationForm,
  ApplicationsSummary,
  ApplicationStatus,
  Availability,
} from '../types';
import type { ApplicationsRepository, SubmitResult } from './applications.repository';

const FILES_BUCKET = 'application-files';

type ApplicationRowLike = {
  id: string;
  event_id: string;
  reference: string;
  name: string;
  email: string;
  answers: unknown;
  status: ApplicationStatus;
  waitlist_position: number | null;
  locale: string;
  consent_at: string;
  created_at: string;
  read_at: string | null;
};

const toApplication = (row: ApplicationRowLike): Application => ({
  id: row.id,
  eventId: row.event_id,
  reference: row.reference,
  name: row.name,
  email: row.email,
  answers: row.answers as Record<string, AnswerValue>,
  status: row.status,
  waitlistPosition: row.waitlist_position,
  locale: row.locale === 'en' ? 'en' : 'mk',
  consentAt: row.consent_at,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const isFileAnswer = (value: AnswerValue): value is ApplicationFile =>
  typeof value === 'object' && 'fileId' in value;

/**
 * Event applications on Supabase (`application_forms`, `applications`, `application_files`, M19b).
 * Scopes (one client per call site, see `applicationsRepository(scope)`):
 * - public: `getForm`, `availability`;
 * - service: `submit` and `storeFile` (after the action's spam, consent and validation checks, D32), `getFile`
 *   and `deleteByEmail` (a private bucket and an e-mail-wide deletion);
 * - session: everything else (the board and assigned managers by RLS; a member's own `listByEmail` / `withdraw`,
 *   decided by the signed-in account, not by the e-mail argument).
 * The reference prefix, places, deadline and admission come from the event row inside `submit_application`,
 * under a lock on the event, so the input's copies of them are ignored.
 */
export function createSupabaseApplicationsRepository(client: DbClient): ApplicationsRepository {
  async function get(id: string) {
    if (!isUuid(id)) return null;
    const row = unwrapMaybe(await client.from('applications').select('*').eq('id', id).maybeSingle());
    return row ? toApplication(row) : null;
  }

  async function getForm(eventId: string): Promise<ApplicationForm | null> {
    if (!isUuid(eventId)) return null;
    const form = unwrap(await client.rpc('application_form_for_event', { p_event: eventId })) as {
      intro: Localized;
      fields: ApplicationField[];
    } | null;
    return form ? { eventId, intro: form.intro, fields: form.fields } : null;
  }

  return {
    getForm,

    async saveForm(form) {
      unwrap(
        await client.rpc('save_application_form', {
          p_event: form.eventId,
          p_intro: toJson(form.intro),
          p_fields: toJson(form.fields),
        }),
      );
      const saved = await getForm(form.eventId);
      if (!saved) throw new DataError('not_found', 'The form could not be saved');
      return saved;
    },

    async deleteForm(eventId) {
      if (!isUuid(eventId)) return;
      unwrap(
        await client.rpc('save_application_form', { p_event: eventId, p_intro: null as never, p_fields: [] }),
      );
    },

    async answerCounts(eventId) {
      if (!isUuid(eventId)) return {};
      return unwrap(await client.rpc('application_answer_counts', { p_event: eventId })) as Record<
        string,
        number
      >;
    },

    async availability(eventIds) {
      const ids = eventIds.filter(isUuid);
      if (ids.length === 0) return {};
      const rows = unwrap(await client.rpc('application_availability', { p_event_ids: ids }));
      const result: Record<string, Availability> = {};
      for (const row of rows) {
        // Events without any accepted or waiting application are left out.
        if (Number(row.taken) > 0 || Number(row.waiting) > 0)
          result[row.event_id] = { taken: Number(row.taken), waitlist: Number(row.waiting) };
      }
      return result;
    },

    async submit(input) {
      if (!isUuid(input.eventId)) return { status: 'closed' };
      const files = Object.entries(input.answers)
        .filter((entry): entry is [string, ApplicationFile] => isFileAnswer(entry[1]))
        .map(([key, file]) => ({
          field_key: key,
          path: file.fileId,
          file_name: file.fileName,
          // The action accepts PDF content only (magic bytes), whatever the browser claimed.
          mime_type: 'application/pdf',
          size_bytes: file.size,
        }));
      const result = unwrap(
        await client.rpc('submit_application', {
          p_event: input.eventId,
          p_name: input.name,
          p_email: input.email,
          p_answers: toJson(input.answers),
          p_locale: input.locale,
          // The action refuses a form without the consent box before it gets here.
          p_consent: true,
          p_files: toJson(files),
        }),
      ) as { status: SubmitResult['status']; application?: ApplicationRowLike };
      if (result.status === 'created' && result.application)
        return { status: 'created', application: toApplication(result.application) };
      return { status: result.status === 'created' ? 'closed' : result.status };
    },

    async storeFile(upload) {
      const fileId = crypto.randomUUID();
      const { error } = await client.storage
        .from(FILES_BUCKET)
        .upload(fileId, upload.bytes, { contentType: upload.type, upsert: false });
      if (error) throw new DataError('invalid', error.message);
      return { fileId, fileName: upload.name, size: upload.bytes.byteLength };
    },

    async list(query) {
      if (!isUuid(query.eventId)) return listApplicationRows([], query);
      const rows = unwrap(await client.from('applications').select('*').eq('event_id', query.eventId));
      return listApplicationRows(rows.map(toApplication), query);
    },

    get,

    async summaries(eventIds) {
      const ids = eventIds.filter(isUuid);
      if (ids.length === 0) return {};
      const result: Record<string, ApplicationsSummary> = {};
      for (const row of unwrap(await client.rpc('application_summaries', { p_event_ids: ids }))) {
        result[row.event_id] = {
          eventId: row.event_id,
          total: Number(row.total),
          newCount: Number(row.new_count),
          byStatus: {
            pending: Number(row.pending),
            accepted: Number(row.accepted),
            rejected: Number(row.rejected),
            waitlist: Number(row.waitlist),
          },
        };
      }
      return result;
    },

    async setStatus(eventId, ids, status) {
      const known = ids.filter(isUuid);
      if (!isUuid(eventId) || known.length === 0) return [];
      return unwrap(
        await client.rpc('set_application_status', { p_event: eventId, p_ids: known, p_status: status }),
      );
    },

    async markRead(id, now) {
      if (!isUuid(id)) return;
      unwrap(await client.rpc('mark_application_read', { p_id: id, p_read_at: now.toISOString() }));
    },

    async listByEmail(email) {
      // Row-level security limits this to the signed-in account's own applications; the e-mail narrows it
      // further (a board member's session could otherwise see every application).
      const pattern = email.trim().replace(/[\\%_]/g, '\\$&');
      const rows = unwrap(
        await client
          .from('applications')
          .select('*')
          .ilike('email', pattern)
          .order('created_at', { ascending: false }),
      );
      return rows.map(toApplication);
    },

    async withdraw(id) {
      if (!isUuid(id)) return 'not_found';
      return unwrap(await client.rpc('withdraw_application', { p_id: id })) === true
        ? 'withdrawn'
        : 'not_found';
    },

    async deleteByEmail(email) {
      return unwrap(await client.rpc('delete_applications_by_email', { p_email: email }));
    },

    async getFile(fileId) {
      if (!isUuid(fileId)) return null;
      const row = unwrapMaybe(
        await client
          .from('application_files')
          .select('file_name, mime_type, size_bytes')
          .eq('path', fileId)
          .maybeSingle(),
      );
      if (!row) return null;
      const downloaded = await client.storage.from(FILES_BUCKET).download(fileId);
      if (downloaded.error || !downloaded.data) return null;
      return {
        fileId,
        fileName: row.file_name,
        size: row.size_bytes,
        type: row.mime_type,
        bytes: new Uint8Array(await downloaded.data.arrayBuffer()),
      };
    },

    async findByFile(fileId) {
      if (!isUuid(fileId)) return null;
      const file = unwrapMaybe(
        await client.from('application_files').select('application_id').eq('path', fileId).maybeSingle(),
      );
      return file ? get(file.application_id) : null;
    },
  };
}
