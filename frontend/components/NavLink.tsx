"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: Route<string>; label: string }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
        isActive
          ? "bg-plum text-white shadow-sm"
          : "border border-plum/10 bg-white/65 text-ink hover:bg-white hover:border-plum/20"
      }`}
    >
      {label}
    </Link>
  );
}
