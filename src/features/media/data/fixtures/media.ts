// SAMPLE DATA for the Media library.
// - Brand logos: the provided files in public/brand (real).
// - Sponsor logos: fictional sample logos from handoff/design-source/assets (public/sample).
// - Photos: the canvas shows striped placeholders with a caption (EventCard, EventDetail,
//   MemoryPost, Journey); they have no file (src: null).
// - Documents: file names from PartnersPage / JoinPage; no file exists yet (src: null).
// Uploaders and dates are sample personas around the canvas moment (4 Oct 2026).
import type { MediaItem, MediaUploader } from '../../types';

const ana: MediaUploader = { userId: 'u-ana', name: 'Ana Trajkovska' };
const stefan: MediaUploader = { userId: 'u-stefan', name: 'Stefan Nikolovski' };
const daniel: MediaUploader = { userId: 'u-daniel', name: 'Daniel Ristov' };
const marija: MediaUploader = { userId: 'u-marija', name: 'Marija Stojanovska' };

const logo = (id: string, fileName: string, size: number, alt: string, uploadedAt: string): MediaItem => ({
  id,
  kind: 'image',
  fileName,
  mimeType: 'image/png',
  size,
  width: 4167,
  height: fileName === 'eestecredsquare.png' ? 4167 : 2942,
  alt,
  src: `/brand/${fileName}`,
  uploadedBy: ana,
  uploadedAt,
});

const sponsor = (slug: string, name: string, size: number, uploadedAt: string): MediaItem => ({
  id: `media-sponsor-${slug}`,
  kind: 'image',
  fileName: `${slug}.svg`,
  mimeType: 'image/svg+xml',
  size,
  width: 400,
  height: 100,
  alt: `${name} logo`,
  src: `/sample/${slug}.svg`,
  uploadedBy: stefan,
  uploadedAt,
});

const photo = (
  id: string,
  fileName: string,
  caption: string,
  alt: string | null,
  uploadedBy: MediaUploader,
  uploadedAt: string,
  credit?: string,
): MediaItem => ({
  id,
  kind: 'image',
  fileName,
  mimeType: 'image/jpeg',
  size: 1_850_000,
  width: 2400,
  height: 1600,
  alt,
  ...(credit ? { credit } : {}),
  src: null,
  sampleCaption: caption,
  uploadedBy,
  uploadedAt,
});

const document = (id: string, fileName: string, size: number, uploadedAt: string): MediaItem => ({
  id,
  kind: 'document',
  fileName,
  mimeType: 'application/pdf',
  size,
  alt: null,
  src: null,
  uploadedBy: ana,
  uploadedAt,
});

export const mediaFixture: MediaItem[] = [
  photo(
    'media-ai-edge-lab',
    'ai-at-the-edge-lab.jpg',
    'participants soldering dev boards in the FEEIT lab',
    'Participants soldering dev boards at a lab bench in FEEIT',
    daniel,
    '2026-10-04T15:58:00+02:00',
  ),
  photo(
    'media-ai-edge-laptop',
    'ai-at-the-edge-laptop.jpg',
    'dev boards and a laptop running a vision model',
    null,
    daniel,
    '2026-10-04T15:57:00+02:00',
  ),
  photo(
    'media-ohrid-selfie',
    'ohrid-group-selfie.jpg',
    'group selfie on the Ohrid lake shore',
    null,
    marija,
    '2026-10-04T13:10:00+02:00',
    'Marija Stojanovska',
  ),
  photo(
    'media-leading-teams',
    'leading-teams-flipchart.jpg',
    'trainer at a flipchart',
    'A trainer writing on a flipchart in front of a group',
    daniel,
    '2026-10-03T19:20:00+02:00',
  ),
  photo(
    'media-soft-skills',
    'soft-skills-academy-group.jpg',
    'participants in a group exercise',
    'Participants standing in a circle during a group exercise',
    marija,
    '2026-09-20T11:00:00+02:00',
  ),
  photo(
    'media-power-up',
    'power-up-solar-plant.jpg',
    'visit to a solar plant near Skopje',
    'Students in hard hats walking between rows of solar panels',
    ana,
    '2026-06-01T10:30:00+02:00',
  ),
  photo(
    'media-career-day',
    'feeit-career-day-booths.jpg',
    'students at company booths',
    'Students talking to company representatives at their booths',
    ana,
    '2026-06-03T09:15:00+02:00',
  ),
  photo(
    'media-eestech-jury',
    'eestech-challenge-jury.jpg',
    'teams presenting to the jury',
    'A student team presenting their project to three jury members',
    stefan,
    '2026-04-15T17:40:00+02:00',
  ),
  logo('media-logo-red', 'LC_Skopje_red.png', 134_038, 'EESTEC LC Skopje', '2026-09-01T12:00:00+02:00'),
  logo('media-logo-white', 'LC_Skopje_white.png', 124_927, 'EESTEC LC Skopje', '2026-09-01T12:00:00+02:00'),
  logo('media-logo-icon', 'eestecredsquare.png', 157_044, 'EESTEC', '2026-09-01T12:01:00+02:00'),
  sponsor('voltline', 'Voltline', 359, '2026-09-12T10:00:00+02:00'),
  sponsor('gridnova', 'Gridnova', 442, '2026-09-12T10:01:00+02:00'),
  sponsor('kodra', 'Kodra', 436, '2026-09-12T10:02:00+02:00'),
  sponsor('amperix', 'Amperix', 576, '2026-09-12T10:03:00+02:00'),
  sponsor('circuitlab', 'CircuitLab', 414, '2026-09-12T10:04:00+02:00'),
  sponsor('quarkwave', 'Quarkwave', 601, '2026-09-12T10:05:00+02:00'),
  document('media-doc-offer', 'partnership-offer-2026.pdf', 2_400_000, '2026-09-10T14:00:00+02:00'),
  document('media-doc-statute', 'statute.pdf', 380_000, '2026-02-01T12:00:00+01:00'),
  document('media-doc-rules', 'internal-rules.pdf', 260_000, '2026-02-01T12:01:00+01:00'),
  document('media-doc-conduct', 'code-of-conduct.pdf', 140_000, '2026-02-01T12:02:00+01:00'),
];
