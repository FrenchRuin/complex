import {
  Baby,
  Bike,
  BookOpen,
  Bus,
  Car,
  CircleEllipsis,
  CirclePlus,
  Coffee,
  Coins,
  Dog,
  Droplet,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  Heart,
  House,
  Landmark,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Scissors,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  SquarePlay,
  TrainFront,
  Undo2,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { isCategoryIconName, type CategoryIconName } from "@/lib/category-icons";

export const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  bike: Bike,
  "shopping-cart": ShoppingCart,
  house: House,
  smartphone: Smartphone,
  bus: Bus,
  "shopping-bag": ShoppingBag,
  pill: Pill,
  shield: Shield,
  "square-play": SquarePlay,
  gift: Gift,
  film: Film,
  "train-front": TrainFront,
  "circle-ellipsis": CircleEllipsis,
  wallet: Wallet,
  coins: Coins,
  "undo-2": Undo2,
  "circle-plus": CirclePlus,
  car: Car,
  fuel: Fuel,
  plane: Plane,
  baby: Baby,
  dog: Dog,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  shirt: Shirt,
  scissors: Scissors,
  heart: Heart,
  "piggy-bank": PiggyBank,
  landmark: Landmark,
  receipt: Receipt,
  wifi: Wifi,
  zap: Zap,
  droplet: Droplet,
};

type Props = { name: string; size?: "md" | "sm" };

/** 원형 surface-sunken 배경 위 카테고리 아이콘. 모르는 이름이면 "기타" 아이콘 */
export function CategoryIcon({ name, size = "md" }: Props) {
  const Icon = isCategoryIconName(name) ? CATEGORY_ICONS[name] : CircleEllipsis;
  const box = size === "md" ? "size-10" : "size-8";
  return (
    <span
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink`}
      aria-hidden
    >
      <Icon size={size === "md" ? 20 : 18} strokeWidth={1.75} />
    </span>
  );
}
