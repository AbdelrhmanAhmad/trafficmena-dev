import {
  Briefcase,
  Calendar,
  FileText,
  Globe,
  Mic,
  Rocket,
  TrendingUp,
  Users,
  Users2,
  type LucideIcon,
} from 'lucide-react';

export const SUBSCRIBE_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  calendar: Calendar,
  fileText: FileText,
  globe: Globe,
  mic: Mic,
  rocket: Rocket,
  trendingUp: TrendingUp,
  users: Users,
  users2: Users2,
};

export function getSubscribeIcon(key: string): LucideIcon {
  return SUBSCRIBE_ICONS[key] ?? Briefcase;
}
