import { Award, CalendarCheck, Globe, Heart, Landmark, Presentation, Star, Users } from 'lucide-react';
import type * as React from 'react';

import type { BadgeIcon } from '../types';

/** The icons a badge can wear (a fixed list; the names are stored, not pictures). */
export const badgeIcons: Record<
  BadgeIcon,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  'calendar-check': CalendarCheck,
  globe: Globe,
  users: Users,
  landmark: Landmark,
  presentation: Presentation,
  award: Award,
  star: Star,
  heart: Heart,
};
