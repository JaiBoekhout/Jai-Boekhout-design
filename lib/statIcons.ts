import {
  TrendingUp, Users, Clock, Globe, Award, Briefcase, MapPin, GraduationCap,
  Star, Target, Zap, CheckCircle, Building, Calendar, Package, Layers, Palette, Rocket,
  type LucideIcon,
} from "lucide-react";

// Curated icon set for CMSStat.icon — used by the At a Glance admin editor's icon picker and
// by every place a stat renders (Evaluate page, Work-page stats bar) to resolve icon -> value.
export const STAT_ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "TrendingUp", Icon: TrendingUp },
  { name: "Users", Icon: Users },
  { name: "Clock", Icon: Clock },
  { name: "Globe", Icon: Globe },
  { name: "Award", Icon: Award },
  { name: "Briefcase", Icon: Briefcase },
  { name: "MapPin", Icon: MapPin },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "Star", Icon: Star },
  { name: "Target", Icon: Target },
  { name: "Zap", Icon: Zap },
  { name: "CheckCircle", Icon: CheckCircle },
  { name: "Building", Icon: Building },
  { name: "Calendar", Icon: Calendar },
  { name: "Package", Icon: Package },
  { name: "Layers", Icon: Layers },
  { name: "Palette", Icon: Palette },
  { name: "Rocket", Icon: Rocket },
];

export const STAT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  STAT_ICON_OPTIONS.map(({ name, Icon }) => [name, Icon])
);

export const DEFAULT_STAT_ICON: LucideIcon = TrendingUp;
