"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/budget", label: "가계부", icon: Wallet },
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
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
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
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
