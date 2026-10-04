## What changed

## How to check

## Checklist

- [ ] Screens compared side by side at 375 / 1024 / 1440 with `handoff/screens` (design source wins on conflicts)
- [ ] Every designed state covered (empty, loading, errors, sending, success, closed…)
- [ ] Keyboard path works; axe shows no serious/critical issues
- [ ] No hard-coded UI copy or content; new keys in both `en.json` and `mk.json` (MK listed in `docs/i18n-review.md`)
- [ ] `pnpm check` and `pnpm build` (empty env) pass
