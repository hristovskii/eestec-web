// SAMPLE DATA — the boards of MembersPage: 2026/2027 (current, with position e-mails from Settings ›
// Contact & legal) and 2025/2026. The canvas offers 2024/2025 and 2023/2024 in the "Show board" list
// but draws no people for them, so they are not invented here. Titles are the ones the Members page
// draws ("Vice Chair · External"); Contact and the footer use the Settings titles.
import type { BoardMandate } from '../../types';

export const mandatesFixture: BoardMandate[] = [
  {
    id: 'm-2026',
    label: '2026/2027',
    startsOn: '2026-10-01',
    endsOn: '2027-09-30',
    isCurrent: true,
    seats: [
      { id: 'bs-2026-chair', boardRoleId: 'role-chair', title: 'Chairperson', userId: 'u-ana' },
      { id: 'bs-2026-ext', boardRoleId: 'role-partners', title: 'Vice Chair · External', userId: 'u-ivana' },
      {
        id: 'bs-2026-int',
        boardRoleId: 'role-members',
        title: 'Vice Chair · Internal',
        userId: 'p-marko-iliev',
      },
      {
        id: 'bs-2026-treasurer',
        boardRoleId: 'role-treasurer',
        title: 'Treasurer',
        userId: 'p-elena-dimitrova',
      },
      { id: 'bs-2026-pr', boardRoleId: 'role-pr', title: 'PR & media', userId: 'u-stefan' },
    ],
  },
  {
    id: 'm-2025',
    label: '2025/2026',
    startsOn: '2025-10-01',
    endsOn: '2026-09-30',
    isCurrent: false,
    seats: [
      { id: 'bs-2025-chair', boardRoleId: 'role-chair', title: 'Chairperson', userId: 'p-bojan-petreski' },
      {
        id: 'bs-2025-ext',
        boardRoleId: 'role-partners',
        title: 'Vice Chair · External',
        userId: 'p-teodora-mitreva',
      },
      {
        id: 'bs-2025-int',
        boardRoleId: 'role-members',
        title: 'Vice Chair · Internal',
        userId: 'p-aleksandar-popov',
      },
      { id: 'bs-2025-treasurer', boardRoleId: 'role-treasurer', title: 'Treasurer', userId: 'p-sara-dimova' },
      { id: 'bs-2025-pr', boardRoleId: 'role-pr', title: 'PR & media', userId: 'u-ana' },
    ],
  },
];
