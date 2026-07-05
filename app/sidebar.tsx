"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Generate",
    icon: (
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center gap-6 border-r border-border py-6">
      <Link
        href="/"
        className="flex h-10 w-10 items-center justify-center rounded-2xl btn-gradient text-sm font-bold text-accent-foreground"
      >
        H
      </Link>

      <nav className="flex flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-xl transition-colors ${
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-2 hover:bg-surface hover:text-foreground"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={active ? "gradient-text" : ""}
                style={active ? { stroke: "url(#nav-gradient)" } : undefined}
              >
                <defs>
                  <linearGradient id="nav-gradient" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="var(--accent-a)" />
                    <stop offset="100%" stopColor="var(--accent-b)" />
                  </linearGradient>
                </defs>
                {item.icon}
              </svg>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
