import { dayInSkopje } from '@/shared/i18n/format';

// Pure helpers for the public event page.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name]!);

/**
 * The board writes the section title as the first heading of the description ("About the
 * workshop", "About the lecture"); the page shows it as the section heading with the red bar.
 */
export function splitLeadingHeading(html: string): { heading: string | null; body: string } {
  const match = /^\s*<h[23][^>]*>(.*?)<\/h[23]>/s.exec(html);
  if (!match) return { heading: null, body: html.trim() };
  const heading = decode(match[1]!.replace(/<[^>]*>/g, '')).trim();
  return { heading: heading || null, body: html.slice(match[0].length).trim() };
}

export type VideoEmbed = { provider: 'youtube' | 'vimeo'; embedUrl: string };

/** YouTube (privacy-enhanced) or Vimeo player URL for a video link, or null. */
export function videoEmbed(url: string): VideoEmbed | null {
  const youtube = /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (youtube)
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1`,
    };
  const vimeo = /^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/.exec(url);
  if (vimeo) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  return null;
}

/** Calendar days an event spans in Skopje ("7–13 Nov 2026 · 7 days"). */
export function daySpan(startsAt: string, endsAt: string): number {
  const day = (iso: string) => Date.parse(`${dayInSkopje(iso)}T12:00:00Z`);
  return Math.round((day(endsAt) - day(startsAt)) / 86_400_000) + 1;
}
