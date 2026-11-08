// SAMPLE DATA — the sample member's choices on /profile (handoff/design-source/MyProfile.dc.html):
// e-mails about events on, photo galleries off, CV sharing on with "Marija_Stojanovska_CV.pdf",
// 240 KB, uploaded and consented on 2 Oct 2026. The file has no content in the sample (nothing to
// download), only the facts the page shows.
import type { CvInfo, MemberConsents } from '../../types';

export const consentsFixture: Record<string, MemberConsents> = {
  'u-marija': {
    newsletter: true,
    galleryName: false,
    cvOptIn: true,
    cvConsentAt: '2026-10-02T18:42:00+02:00',
  },
};

export const cvsFixture: Record<string, { info: CvInfo; bytes: Uint8Array | null }> = {
  'u-marija': {
    info: {
      fileName: 'Marija_Stojanovska_CV.pdf',
      size: 240 * 1024,
      uploadedAt: '2026-10-02T18:44:00+02:00',
    },
    bytes: null,
  },
};
