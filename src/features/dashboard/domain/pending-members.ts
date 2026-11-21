export const YEAR_LABEL = {
  '1': '1st year',
  '2': '2nd year',
  '3': '3rd year',
  '4': '4th year',
  master: 'Master’s',
  phd: 'PhD',
} as const;

/** "FEEIT, 2nd year": what the approvals list says about a registration. */
export function memberMeta(faculty: string, year: string | null | undefined): string {
  const label = year && year in YEAR_LABEL ? YEAR_LABEL[year as keyof typeof YEAR_LABEL] : '';
  return [faculty, label].filter(Boolean).join(', ');
}
