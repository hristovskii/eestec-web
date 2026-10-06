import { describe, expect, it } from 'vitest';

import { daySpan, splitLeadingHeading, videoEmbed } from './event-content';

describe('splitLeadingHeading', () => {
  it('lifts the first heading out of the description', () => {
    expect(splitLeadingHeading('<h3>About the workshop</h3><p>Text</p>')).toEqual({
      heading: 'About the workshop',
      body: '<p>Text</p>',
    });
    expect(splitLeadingHeading('<h2>Q&amp;A <strong>night</strong></h2><p>x</p>').heading).toBe('Q&A night');
  });

  it('leaves descriptions without a leading heading alone', () => {
    expect(splitLeadingHeading('<p>Intro</p><h3>Later</h3>')).toEqual({
      heading: null,
      body: '<p>Intro</p><h3>Later</h3>',
    });
    expect(splitLeadingHeading('')).toEqual({ heading: null, body: '' });
  });
});

describe('videoEmbed', () => {
  it('builds privacy-enhanced YouTube and Vimeo players', () => {
    expect(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ?t=10')?.provider).toBe('youtube');
    expect(videoEmbed('https://vimeo.com/76979871')?.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1',
    );
  });

  it('rejects anything else', () => {
    expect(videoEmbed('https://example.com/watch?v=abc')).toBeNull();
    expect(videoEmbed('')).toBeNull();
  });
});

describe('daySpan', () => {
  it('counts Skopje calendar days', () => {
    expect(daySpan('2026-05-18T00:00:00+02:00', '2026-05-24T23:59:00+02:00')).toBe(7);
    expect(daySpan('2024-12-09T18:00:00+01:00', '2024-12-09T18:00:00+01:00')).toBe(1);
    expect(daySpan('2026-10-24T22:00:00+02:00', '2026-10-26T09:00:00+01:00')).toBe(3);
  });
});
