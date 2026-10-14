import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Globe,
  Landmark,
  Lightbulb,
  type LucideIcon,
  MessagesSquare,
  Mountain,
  Plane,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';

import type { ActivityIcon } from '../types';

const ICONS: Record<ActivityIcon, LucideIcon> = {
  wrench: Wrench,
  plane: Plane,
  mountain: Mountain,
  messages: MessagesSquare,
  trophy: Trophy,
  landmark: Landmark,
  graduation: GraduationCap,
  globe: Globe,
  users: Users,
  lightbulb: Lightbulb,
  book: BookOpen,
  calendar: CalendarDays,
};

/** The icon of an activity card (decorative: the card's title names it). */
export function ActivityIconView({ icon, className }: { icon: ActivityIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
