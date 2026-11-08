// /members/<username> addresses, without zod: the events tabs are plain links.

/** `?events=organized|attended` picks the tab, `show=all` shows every event of it. */
export type ProfileParams = {
  events: 'all' | 'organized' | 'attended';
  show?: 'all' | undefined;
};

export function profileHref(username: string, params: ProfileParams, hash?: 'events') {
  const next = new URLSearchParams();
  if (params.events !== 'all') next.set('events', params.events);
  if (params.show === 'all') next.set('show', 'all');
  const query = next.toString();
  return `/members/${username}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}
