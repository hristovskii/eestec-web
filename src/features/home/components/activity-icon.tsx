import {
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  Cpu,
  GraduationCap,
  Globe,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  Plane,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import type { ActivityIcon } from '../types';

const ICONS: Record<ActivityIcon, LucideIcon> = {
  cpu: Cpu,
  exchange: ArrowRightLeft,
  zap: Zap,
  message: MessageCircle,
  trophy: Trophy,
  users: Users,
  graduation: GraduationCap,
  globe: Globe,
  lightbulb: Lightbulb,
  book: BookOpen,
  calendar: CalendarDays,
  plane: Plane,
};

/** The icon of an activity card (decorative: the card's title names it). */
export function ActivityIconView({ icon, className }: { icon: ActivityIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
