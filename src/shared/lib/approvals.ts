// Small rules of Admin › Approvals: how long something has been waiting, shown on the list and the preview.

/** "20 min", "5 h" (under two days), "3 d". */
export function waitingTime(submittedAt: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(submittedAt).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}
