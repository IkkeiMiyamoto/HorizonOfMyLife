import {
  Baby,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Camera,
  CircleDashed,
  Code,
  Coffee,
  Coins,
  Dumbbell,
  Flame,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Leaf,
  Moon,
  Mountain,
  Music,
  Palette,
  PawPrint,
  PiggyBank,
  Plane,
  Rocket,
  Shirt,
  Smile,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  Trophy,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { createContext, useContext, useMemo } from "react";
import type { Category, CategoryId } from "../types";

/** カテゴリに選べるアイコン（キーは保存データに入るので変更しないこと） */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  graduation: GraduationCap,
  heart_pulse: HeartPulse,
  coins: Coins,
  users: Users,
  sparkles: Sparkles,
  house: House,
  plane: Plane,
  globe: Globe,
  music: Music,
  palette: Palette,
  camera: Camera,
  book: BookOpen,
  code: Code,
  brain: Brain,
  dumbbell: Dumbbell,
  bike: Bike,
  mountain: Mountain,
  leaf: Leaf,
  sprout: Sprout,
  heart: Heart,
  baby: Baby,
  paw: PawPrint,
  smile: Smile,
  piggy: PiggyBank,
  trophy: Trophy,
  target: Target,
  rocket: Rocket,
  star: Star,
  flame: Flame,
  sun: Sun,
  moon: Moon,
  coffee: Coffee,
  utensils: Utensils,
  shirt: Shirt,
  gamepad: Gamepad2,
};

/** 夜空に映える色だけに絞ったパレット */
export const CATEGORY_COLORS = [
  "#38bdf8",
  "#22d3ee",
  "#2dd4bf",
  "#34d399",
  "#a3e635",
  "#facc15",
  "#fbbf24",
  "#fb923c",
  "#f87171",
  "#fb7185",
  "#f472b6",
  "#e879f9",
  "#c084fc",
  "#a78bfa",
  "#818cf8",
  "#60a5fa",
  "#cbd5e1",
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "career", label: "キャリア", color: "#38bdf8", icon: "briefcase" },
  { id: "learning", label: "学び", color: "#a78bfa", icon: "graduation" },
  { id: "health", label: "健康", color: "#34d399", icon: "heart_pulse" },
  { id: "finance", label: "お金", color: "#fbbf24", icon: "coins" },
  { id: "relationships", label: "人間関係", color: "#f472b6", icon: "users" },
  { id: "creative", label: "創造・趣味", color: "#fb923c", icon: "sparkles" },
];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  iconKey: string;
  icon: LucideIcon;
}

export const toMeta = (c: Category): CategoryMeta => ({
  id: c.id,
  label: c.label,
  color: c.color,
  iconKey: c.icon,
  icon: CATEGORY_ICONS[c.icon] ?? CircleDashed,
});

/** 削除済みなどで見つからないカテゴリの表示 */
const UNKNOWN: CategoryMeta = { id: "", label: "未分類", color: "#94a3b8", iconKey: "", icon: CircleDashed };

export const CategoriesContext = createContext<Category[]>(DEFAULT_CATEGORIES);

export function useCategories() {
  const list = useContext(CategoriesContext);
  return useMemo(() => {
    const categories = list.map(toMeta);
    const byId = new Map(categories.map((c) => [c.id, c]));
    return {
      categories,
      categoryIds: categories.map((c) => c.id),
      categoryOf: (id: CategoryId): CategoryMeta => byId.get(id) ?? { ...UNKNOWN, id },
    };
  }, [list]);
}
