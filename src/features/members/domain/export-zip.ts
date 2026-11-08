import { strToU8, zipSync } from 'fflate';

// "Download my data" (MyProfile › Account): everything the site stores about the member, as a ZIP
// of readable files. Built from plain parts so it can be tested without a server.

export type MyDataParts = {
  profile: unknown;
  account: unknown;
  consents: unknown;
  applications: unknown;
  /** The profile photo, when there is one. */
  photo: { bytes: Uint8Array; extension: 'jpg' | 'png' } | null;
  /** The CV file, when there is one (the sample CV has no content). */
  cv: { bytes: Uint8Array } | null;
  /** ISO date-time of the export. */
  exportedAt: string;
};

const json = (value: unknown) => strToU8(`${JSON.stringify(value, null, 2)}\n`);

export function buildMyDataZip(parts: MyDataParts): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'README.txt': strToU8(
      [
        'Your data from eestec.mk (EESTEC LC Skopje)',
        `Created on ${parts.exportedAt}`,
        '',
        'profile.json       what is on your profile (names, bio, links, teams, badges, events)',
        'account.json       your account: e-mail, phone, year of study, consent dates',
        'consents.json      your choices (e-mails, gallery names, CV sharing)',
        'applications.json  the events you applied to, with your answers',
        'photo.*            your profile photo (if you have one)',
        'cv.pdf             your CV (if you uploaded one)',
        '',
      ].join('\n'),
    ),
    'profile.json': json(parts.profile),
    'account.json': json(parts.account),
    'consents.json': json(parts.consents),
    'applications.json': json(parts.applications),
  };
  if (parts.photo) files[`photo.${parts.photo.extension}`] = parts.photo.bytes;
  if (parts.cv) files['cv.pdf'] = parts.cv.bytes;
  return zipSync(files);
}
