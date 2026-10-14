import {
  Briefcase,
  Cpu,
  Flag,
  GraduationCap,
  Globe,
  Handshake,
  type LucideIcon,
  Megaphone,
  Mic,
  Star,
  Users,
} from 'lucide-react';

import type { PartnerIcon } from '../types';

const ICONS: Record<PartnerIcon, LucideIcon> = {
  users: Users,
  star: Star,
  chip: Cpu,
  briefcase: Briefcase,
  mic: Mic,
  flag: Flag,
  handshake: Handshake,
  megaphone: Megaphone,
  graduation: GraduationCap,
  globe: Globe,
};

/** The icon of a card (decorative: the card's title names it). An unknown name falls back to a neutral one. */
export function PartnerIconView({ icon, className }: { icon: PartnerIcon; className?: string }) {
  const Icon = (ICONS as Partial<Record<string, LucideIcon>>)[icon] ?? Users;
  return <Icon className={className} aria-hidden />;
}
