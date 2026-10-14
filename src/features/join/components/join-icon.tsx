import {
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Cpu,
  Flag,
  GraduationCap,
  Globe,
  Heart,
  Lightbulb,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import type { JoinIcon } from '../types';

const ICONS: Record<JoinIcon, LucideIcon> = {
  users: Users,
  clock: Clock,
  wallet: Wallet,
  calendar: CalendarDays,
  globe: Globe,
  chip: Cpu,
  chat: MessageCircle,
  clip: ClipboardCheck,
  briefcase: Briefcase,
  heart: Heart,
  flag: Flag,
  shield: ShieldCheck,
  graduation: GraduationCap,
  lightbulb: Lightbulb,
};

/** The icon of a card (decorative: the card's title names it). An unknown name falls back to a neutral one. */
export function JoinIconView({ icon, className }: { icon: JoinIcon; className?: string }) {
  const Icon = (ICONS as Partial<Record<string, LucideIcon>>)[icon] ?? Users;
  return <Icon className={className} aria-hidden />;
}
