# Page: Submit Your Idea / Impressions

**Route:** `/submit`
**Goal:** A simple place where anyone can send ideas for new events or improvements, and share impressions or feedback after events.

Follows the global design system in `00-overview-and-design-system.md`.

---

## Layout

Two tabs (or a selector at the top of the form):

### Tab 1: Submit an idea
- Open to everyone (members and non-members).
- Fields: name (optional), e-mail (optional), idea type (new event, workshop topic, partnership/company, website improvement, other), title, description, optional attachment.
- Checkbox: "Submit anonymously" (hides name and e-mail).
- Short text above the form explaining that the board reviews all ideas.

### Tab 2: Share an impression / feedback
- Select the event (dropdown from Events) or "other".
- Rating (1–5 stars, optional), text, optional photos.
- If the person is a logged-in member, a checkbox: "Turn this into a Memories post", which sends it to the Memories approval queue (see `05-memories.md`).
- Non-members' impressions are stored as feedback only (visible to the board, not public).

## After submission
- Thank-you message on screen.
- Spam protection (e.g. hCaptcha / reCAPTCHA or a honeypot field).

---

## Admin-managed data

- Inbox of all submissions with status: new / under review / accepted / archived
- Internal notes per submission
- Event feedback overview (average rating per event, list of comments)
- Editable intro texts and idea type list
- E-mail notification to the board on every new submission (on/off)
