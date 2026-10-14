import {
  CalendarDays,
  Flag,
  GraduationCap,
  Globe,
  Heart,
  Lightbulb,
  Link2,
  type LucideIcon,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';

import type { JourneyIcon } from '../types';

const ICONS: Record<JourneyIcon, LucideIcon> = {
  'user-plus': UserPlus,
  calendar: CalendarDays,
  heart: Heart,
  globe: Globe,
  flag: Flag,
  link: Link2,
  users: Users,
  graduation: GraduationCap,
  lightbulb: Lightbulb,
  trophy: Trophy,
};

/** The icon of a step (decorative: the step's title names it). An unknown name falls back to a neutral one. */
export function JourneyIconView({ icon, className }: { icon: JourneyIcon; className?: string }) {
  const Icon = (ICONS as Partial<Record<string, LucideIcon>>)[icon] ?? Users;
  return <Icon className={className} aria-hidden />;
}
