# Sample data to replace before launch

Everything the site shows today comes from sample data transcribed from the design canvas (CLAUDE.md:
"never invent content, mark it as sample"). The mock repositories keep it in memory; it is **not**
real. This page lists where each kind of sample data lives and who has to replace it. M19 turns the
fixtures into `supabase/seed.sql` with every sample row flagged and purgeable; M23 purges them.

The site shows a "Preview with sample data" ribbon while `DATA_SOURCE=mock` outside development, so
a sample deployment can never be mistaken for the real site.

## Committees (Map / Committees, Home map) — the board must replace this

| File                                                  | What it is                                                                                                                                                                                                                                                                                                                                                          | Replace how                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/committees/data/fixtures/committees.ts` | 35 committees from the canvas map (23 Local Committees, 8 Observers, 4 JLCs, 21 countries) plus LC Skopje. **Names, types and the city list come from the canvas; they may be out of date.** The coordinates are the real positions of each city, rounded to two decimals. No committee except LC Skopje has a website. Cities are in Latin (Macedonian = English). | In **Admin › Map / Committees**: check every row against eestec.net (still active? which type?), add websites, write the Macedonian spelling of the cities (Скопје…). Or **Import CSV** (name, type, city, country, lat, lng, link); _Export CSV_ gives a file in that format. |

Not sample, but the board decides: the tile provider in `src/shared/config/map.ts` (OpenStreetMap's own
server is fine for a small site; a hosted provider is one edit there).

## Other sample data

| Feature               | File                                                          | Replace through                                                      |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Events                | `src/features/events/data/fixtures/events.ts`                 | Admin › Events (the 23 sample events are deleted or overwritten)     |
| Applications          | `src/features/applications/data/fixtures/applications.ts`     | Deleted with the sample events; real applications come from the site |
| Media library         | `src/features/media/data/fixtures/media.ts`, `public/sample/` | Admin › Media library (upload the real photos and logos)             |
| Settings              | `src/features/settings/data/fixtures/settings.ts`             | Admin › Settings (bracketed legal numbers are canvas placeholders)   |
| Dashboard numbers     | `src/features/dashboard/data/fixtures/dashboard.ts`           | Replaced by real counts as each feature's data is real               |
| Admin accounts        | `src/features/auth/data/fixtures/accounts.ts`, `personas.ts`  | Real accounts through the invite flow (Supabase Auth, M21)           |
| Activity log          | `src/features/activity/data/fixtures/activity.ts`             | Written by the database from M19 on; sample entries are purged       |
| Privacy policy text   | in Settings (D17: clearly marked placeholder)                 | Admin › Settings, once the board supplies the text                   |
| Macedonian UI strings | `src/shared/i18n/messages/mk.json`                            | Reviewed by a native speaker: see `docs/i18n-review.md`              |

Sample content is English; Macedonian fields reuse the English text until the board supplies
Macedonian (D14).
