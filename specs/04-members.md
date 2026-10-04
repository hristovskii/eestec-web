# Page: Members

**Route:** `/members`, `/members/[username]`, `/register`, `/login`, `/profile`
**Goal:** Show the people of LC Skopje (similar to member profiles on eestec.net) and let members register and manage their own profile.

Follows the global design system in `00-overview-and-design-system.md`.

---

## Public members page (`/members`)

### 1. Board
- Shown at the top: photo, name, position (Chairperson, Vice Chairpersons, Treasurer, PR, etc.), position e-mail (e.g. `pr@eestec.mk`).
- Board mandate year shown (e.g. "Board 2026/2027"). Previous boards available in a dropdown.

### 2. Active members
- Grid of member cards: photo, name, role/team, year joined.
- Filter by team (IT, PR, FR, HR, Events, ...) and search by name.
- Only profiles set to **public** appear here for visitors; logged-in members also see "members only" profiles.

### 3. Alumni
- Former members, with the years they were active and optionally their current position.

---

## Member profile (`/members/[username]`)

- Photo, name, role / team, year joined, short bio
- Events attended / organized (linked to `/events`)
- Memories written (linked to `/memories`)
- Optional badges (e.g. "First international event", "Organizer", "Board member", "Trainer")
- Optional links: LinkedIn, GitHub

---

## Registration & login

- `/register`: name, e-mail, password, faculty, year of study, phone (optional), photo, consent checkbox for personal data processing, profile visibility (public / members only).
- New accounts get status **"Pending approval"** until an admin confirms the person is an actual member.
- `/login`, password reset by e-mail.
- Optional: if EESTEC International provides an API/SSO, allow login with an eestec.net account so members don't need two accounts.

## My profile (`/profile`, logged-in)

- Edit photo, bio, links, visibility
- See my applications to upcoming events and their status
- See my Memories (draft / pending / published) and create new ones
- Delete account option (removes personal data)

---

## Admin-managed data

- Approve / reject registrations
- Edit any member: role, team, status (active / alumni / inactive), badges
- Board composition per mandate year
- Teams list
- Remove or hide profiles
