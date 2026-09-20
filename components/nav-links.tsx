"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "대시보드", icon: LayoutGrid },
  { href: "/budget", label: "가계부", icon: CalendarDays },
  { href: "/settings", label: "설정", icon: Settings },
];

export function NavLinks({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav className="flex items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-primary font-semibold" : "text-ink-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-primary font-semibold"
                : "text-ink-secondary hover:bg-accent/60 hover:text-primary",
            )}
          >
            <Icon className="size-[19px]" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
