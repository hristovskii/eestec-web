import type { Localized } from '@/shared/types/localized';

import type { JoinLine, JoinRecord } from '../../types';

// SAMPLE DATA, transcribed from handoff/design-source/JoinPage.dc.html and JoinForm.dc.html
// (docs/sample-data.md). The rules, the fee (600 MKD) and the conditions are the canvas's examples:
// **the board decides the real ones**. The canvas is English only, so Macedonian reuses the English
// text until the board supplies it (D14). The PDFs are SAMPLE library items without a file.

const both = (text: string): Localized => ({ mk: text, en: text });
const line = (id: string, text: string): JoinLine => ({ id, text: both(text) });

export const joinFixture: JoinRecord = {
  hero: {
    eyebrow: both('Join Us'),
    title: both('Become an EESTECer'),
    lead: both('Learn, travel and organize with 80 engineering students in Skopje and 5,000+ across Europe.'),
  },
  headings: {
    why: both('What you get out of it'),
    who: both('Students in Skopje, any year'),
    how: both('Four steps to full membership'),
    rules: both('The short version'),
    faq: both('Questions we hear a lot'),
    apply: both('Apply for membership'),
  },
  glance: [
    { id: 'glance-1', icon: 'users', label: both('Who'), value: both('University students in Skopje') },
    { id: 'glance-2', icon: 'clock', label: both('Time'), value: both('About 2–4 hours a week') },
    {
      id: 'glance-3',
      icon: 'wallet',
      label: both('Fee'),
      value: both('600 MKD / year, once you’re a full member'),
    },
  ],
  benefits: [
    {
      id: 'benefit-1',
      icon: 'globe',
      title: both('International experience'),
      text: both('Workshops and exchanges in 20+ countries, often for a small fee.'),
    },
    {
      id: 'benefit-2',
      icon: 'chip',
      title: both('Technical knowledge'),
      text: both('Hands-on workshops on embedded systems, AI, power and more.'),
    },
    {
      id: 'benefit-3',
      icon: 'chat',
      title: both('Soft skills'),
      text: both('Communication, leadership and teamwork trainings with certified trainers.'),
    },
    {
      id: 'benefit-4',
      icon: 'users',
      title: both('Friends across Europe'),
      text: both('A network of 5,000+ students who will happily host you.'),
    },
    {
      id: 'benefit-5',
      icon: 'clip',
      title: both('Organizing experience'),
      text: both('Plan real events with real budgets, from a lecture to a week-long workshop.'),
    },
    {
      id: 'benefit-6',
      icon: 'briefcase',
      title: both('Contacts with companies'),
      text: both('Meet partners at career days, company visits and workshops.'),
    },
  ],
  eligibility: {
    items: [
      line('elig-1', 'Bachelor’s, master’s or PhD students at FEEIT'),
      line('elig-2', 'Students from other faculties and universities in Skopje are welcome too'),
      line('elig-3', 'Any year of study, including your final year'),
      line('elig-4', 'No experience needed, just curiosity and some free time'),
    ],
    noteTitle: both('Not sure you qualify?'),
    noteText: both(
      'The exact rules are set by the board. Write to us or just come to a Wednesday meeting and ask.',
    ),
  },
  steps: [
    { id: 'step-1', title: both('Fill in the form'), text: both('Five minutes, right here on this page.') },
    {
      id: 'step-2',
      title: both('Come to a weekly meeting'),
      text: both('Wednesdays at 18:00 in room 117, or the next info session.'),
    },
    {
      id: 'step-3',
      title: both('Join a team'),
      text: both('IT, PR, design, events, fundraising or trainings.'),
    },
    {
      id: 'step-4',
      title: both('Become a full member'),
      text: both('After 3 months of activity and paying the yearly fee.'),
    },
  ],
  fee: {
    amount: both('600 MKD'),
    per: both('/ academic year'),
    note: both(
      'You only pay when you become a full member. Pay in cash at a weekly meeting or by bank transfer; the details are in your welcome e-mail.',
    ),
  },
  rules: {
    intro: both(
      'The official documents are at the bottom of this section. Here is what they mean in practice.',
    ),
    rights: [
      line('right-1', 'Take part in all local and international events'),
      line('right-2', 'Vote and run for the LC Skopje board'),
      line('right-3', 'Use the EESTEC network for your own projects'),
      line('right-4', 'Get support and mentoring from older members'),
    ],
    duties: [
      line('duty-1', 'Be active in at least one team'),
      line('duty-2', 'Come to the weekly meetings when you can'),
      line('duty-3', 'Pay the yearly membership fee'),
      line('duty-4', 'Follow the statute and the code of conduct'),
    ],
    conduct: [
      {
        id: 'conduct-1',
        icon: 'heart',
        title: both('Respect'),
        text: both('Treat everyone with respect, online and offline.'),
      },
      {
        id: 'conduct-2',
        icon: 'users',
        title: both('Inclusion'),
        text: both('Everyone is welcome, whatever their background or beliefs.'),
      },
      {
        id: 'conduct-3',
        icon: 'flag',
        title: both('Represent us well'),
        text: both('At events abroad you represent LC Skopje and EESTEC.'),
      },
      {
        id: 'conduct-4',
        icon: 'shield',
        title: both('Zero tolerance'),
        text: both('Harassment and discrimination lead to removal. Report it to the board in confidence.'),
      },
    ],
    international: {
      before: [
        line('before-1', 'Write your own motivation letter; the board can review it'),
        line('before-2', 'Apply only if you can really attend'),
      ],
      during: [
        line('during-1', 'Attend all sessions'),
        line('during-2', 'Follow the host committee’s rules'),
      ],
      after: [
        line('after-1', 'Within 2 weeks, write a short report or a Memories post'),
        line('after-2', 'Share what you learned at a weekly meeting'),
      ],
    },
  },
  documents: [
    { id: 'doc-1', title: both('Statute'), mediaId: 'media-doc-statute' },
    { id: 'doc-2', title: both('Internal rules'), mediaId: 'media-doc-rules' },
    { id: 'doc-3', title: both('Code of conduct'), mediaId: 'media-doc-conduct' },
  ],
  faq: [
    {
      id: 'faq-1',
      question: both('Do I have to study at FEEIT?'),
      answer: both(
        'No. Most members study at FEEIT, but students from other faculties and universities in Skopje are welcome too.',
      ),
    },
    {
      id: 'faq-2',
      question: both('How much time does it take?'),
      answer: both(
        'As much as you want to give. Most members spend 2–4 hours a week: the Wednesday meeting plus some team work. Before a big event it can be more, and that’s usually the fun part.',
      ),
    },
    {
      id: 'faq-3',
      question: both('Does it cost anything?'),
      answer: both(
        'Applying and trying it out is free. Full members pay 600 MKD per academic year. International events usually have a small participation fee.',
      ),
    },
    {
      id: 'faq-4',
      question: both('Do I need to speak English?'),
      answer: both(
        'Basic English is enough to start. Local activities are in Macedonian; international events are in English and a great way to practise.',
      ),
    },
    {
      id: 'faq-5',
      question: both('Can I join in my final year?'),
      answer: both('Yes. You can stay active until you graduate and then join our alumni.'),
    },
    {
      id: 'faq-6',
      question: both('When can I apply?'),
      answer: both(
        'Membership applications open at the start of each semester. The form below shows whether they are open right now.',
      ),
    },
  ],
  apply: {
    open: true,
    nextRound: both('February 2027'),
    intro: both(
      "Tell us a bit about yourself. We'll reply within 3 days and invite you to the next weekly meeting.",
    ),
    faculties: [
      line('fac-1', 'FEEIT'),
      line('fac-2', 'FINKI'),
      line('fac-3', 'Faculty of Mechanical Engineering'),
      line('fac-4', 'Other faculty at UKIM'),
      line('fac-5', 'Other university'),
    ],
    interests: [
      line('int-1', 'IT'),
      line('int-2', 'PR'),
      line('int-3', 'Design'),
      line('int-4', 'Events'),
      line('int-5', 'Fundraising'),
      line('int-6', 'Trainings'),
    ],
    heardFrom: [
      line('heard-1', 'Instagram'),
      line('heard-2', 'A friend'),
      line('heard-3', 'Info stand at FEEIT'),
      line('heard-4', 'Facebook'),
      line('heard-5', 'An event'),
      line('heard-6', 'Other'),
    ],
  },
};
