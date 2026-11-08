// SAMPLE DATA — the team chips of MembersPage (Events, IT, PR, HR, FR, Design). Macedonian = English
// until the board writes the Macedonian names (Admin › Members › Teams).
import type { Badge, Team } from '../../types';

const both = (text: string) => ({ mk: text, en: text });

export const teamsFixture: Team[] = [
  { id: 't-events', slug: 'events', name: both('Events'), sortOrder: 1 },
  { id: 't-it', slug: 'it', name: both('IT'), sortOrder: 2 },
  { id: 't-pr', slug: 'pr', name: both('PR'), sortOrder: 3 },
  { id: 't-hr', slug: 'hr', name: both('HR'), sortOrder: 4 },
  { id: 't-fr', slug: 'fr', name: both('FR'), sortOrder: 5 },
  { id: 't-design', slug: 'design', name: both('Design'), sortOrder: 6 },
];

// SAMPLE DATA — the badges of MemberProfile (Organizer, First international event, Team lead) and
// the two the spec names besides (Board member, Trainer). Descriptions on a profile are the badge
// note (e.g. "Helped organize 3 events"); the description here says what the badge means.
export const badgesFixture: Badge[] = [
  {
    id: 'b-organizer',
    name: both('Organizer'),
    description: both('Helped organize an event.'),
    icon: 'star',
  },
  {
    id: 'b-first-international',
    name: both('First international event'),
    description: both('Took part in an international EESTEC event.'),
    icon: 'globe',
  },
  { id: 'b-team-lead', name: both('Team lead'), description: both('Leads a team.'), icon: 'users' },
  {
    id: 'b-board',
    name: both('Board member'),
    description: both('Served on the board.'),
    icon: 'landmark',
  },
  {
    id: 'b-trainer',
    name: both('Trainer'),
    description: both('Trains other members.'),
    icon: 'presentation',
  },
];
