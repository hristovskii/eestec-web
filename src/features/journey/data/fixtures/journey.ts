import type { Localized } from '@/shared/types/localized';

import type { JourneyRecord } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/Journey.dc.html (docs/sample-data.md). The
// quotes and their authors are the canvas's examples, not real people's words. The board replaces
// everything in Admin › Pages › Journey. The canvas is English only, so Macedonian reuses the
// English text until the board supplies it (D14). Photos are the canvas's "Photo: …" placeholders.

const both = (text: string): Localized => ({ mk: text, en: text });

export const journeyFixture: JourneyRecord = {
  hero: {
    eyebrow: both('EESTEC Journey'),
    title: both('From your first meeting to alumni'),
    lead: both('Six steps to get the most out of EESTEC. Start wherever you are.'),
  },
  steps: [
    {
      id: 'step-1',
      icon: 'user-plus',
      title: both('Join'),
      text: both('Become a member of LC Skopje.'),
      button: { label: both('Join Us'), href: '/join' },
      bullets: [
        { id: 'step-1-b1', text: both('Meet students from every year and department') },
        { id: 'step-1-b2', text: both('Come to the weekly meeting every Wednesday') },
        { id: 'step-1-b3', text: both('No experience needed, just curiosity') },
      ],
      photo: {
        mediaId: 'media-journey-meeting',
        alt: both('Students sitting around a table at a Wednesday meeting in room 117'),
      },
      quote: {
        text: both('I came to one meeting for the free pizza. Three years later I’m still here.'),
        author: both('Elena Petrovska · member since 2023'),
      },
    },
    {
      id: 'step-2',
      icon: 'calendar',
      title: both('Participate'),
      text: both('Attend local workshops, trainings and socials.'),
      button: { label: both('Upcoming Events'), href: '/upcoming' },
      bullets: [
        { id: 'step-2-b1', text: both('Hands-on technical workshops at FEEIT') },
        { id: 'step-2-b2', text: both('Soft skills trainings with certified trainers') },
        { id: 'step-2-b3', text: both('Socials, trips and the New Year party') },
      ],
      photo: { mediaId: 'media-journey-workshop', alt: both('Students soldering at a local workshop') },
      quote: {
        text: both('The PCB workshop taught me more than a whole semester of theory.'),
        author: both('Daniel Ristov · 2nd year, FEEIT'),
      },
    },
    {
      id: 'step-3',
      icon: 'heart',
      title: both('Volunteer & Organize'),
      text: both('Join a team and help organize events.'),
      button: { label: both('Meet the teams'), href: '/members#teams' },
      bullets: [
        { id: 'step-3-b1', text: both('Teams for IT, PR, HR, fundraising and events') },
        { id: 'step-3-b2', text: both('Learn project management by doing') },
        { id: 'step-3-b3', text: both('Organize your first event with a mentor') },
      ],
      photo: {
        mediaId: 'media-journey-team',
        alt: both('An organizing team planning an event at a whiteboard'),
      },
      quote: {
        text: both('Organizing a workshop for 24 people is the best crash course in teamwork.'),
        author: both('Marija Stojanovska · Power Up organizer'),
      },
    },
    {
      id: 'step-4',
      icon: 'globe',
      title: both('Go International'),
      text: both('Apply for workshops and exchanges across Europe.'),
      button: { label: both('See events abroad'), href: '/upcoming?scope=international' },
      bullets: [
        { id: 'step-4-b1', text: both('Workshops and exchanges in 20+ countries') },
        { id: 'step-4-b2', text: both('Usually only a small participation fee') },
        { id: 'step-4-b3', text: both('Friends in every corner of Europe') },
      ],
      photo: {
        mediaId: 'media-journey-exchange',
        alt: both('An exchange group posing in front of TU Delft'),
      },
      quote: {
        text: both('My first exchange changed everything.'),
        author: both('Stefan Nikolovski · exchange in Delft, 2026'),
      },
    },
    {
      id: 'step-5',
      icon: 'flag',
      title: both('Lead'),
      text: both('Become a coordinator, board member or join international teams, ECM and Congress.'),
      button: { label: both('How to get involved'), href: '/join' },
      bullets: [
        { id: 'step-5-b1', text: both('Coordinate a team or a project') },
        { id: 'step-5-b2', text: both('Run for the LC Skopje board') },
        { id: 'step-5-b3', text: both('Represent Skopje at ECM and Congress') },
      ],
      photo: {
        mediaId: 'media-journey-congress',
        alt: both('The LC Skopje delegation at an EESTEC Congress'),
      },
      quote: {
        text: both('Leading the board taught me to make decisions with 80 people watching.'),
        author: both('Ana Trajkovska · chairperson 2025'),
      },
    },
    {
      id: 'step-6',
      icon: 'link',
      title: both('Stay Connected'),
      text: both('Become alumni and support the next generation.'),
      button: { label: both('Our alumni'), href: '/members?group=alumni' },
      bullets: [
        { id: 'step-6-b1', text: both('Mentor new members') },
        { id: 'step-6-b2', text: both('Give a talk or bring your company to FEEIT') },
        { id: 'step-6-b3', text: both('Stay part of the network for life') },
      ],
      photo: { mediaId: 'media-journey-alumni', alt: both('An alumnus giving a talk at the career day') },
      quote: {
        text: both('Half of my colleagues today are people I met through EESTEC.'),
        author: both('Nikola Georgiev · alumnus, 2019'),
      },
    },
  ],
  cta: {
    title: both('Ready for step one?'),
    text: both('It takes five minutes: tell us a bit about yourself, then come to a Wednesday meeting.'),
    button: { label: both('Start your journey'), href: '/join' },
  },
};
