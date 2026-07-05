"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Groups mirror Higgsfield's own nav structure (Create vs Tools). Only add an
// item once its route actually exists — omit unbuilt capabilities rather than
// linking to a 404.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Create",
    items: [
      {
        href: "/create/image",
        label: "Image",
        icon: (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </>
        ),
      },
      {
        href: "/create/video",
        label: "Video",
        icon: (
          <>
            <rect x="2.5" y="6" width="14" height="12" rx="2" />
            <path d="M16.5 10l5-3v10l-5-3" strokeLinejoin="round" />
          </>
        ),
      },
      {
        href: "/create/audio",
        label: "Audio",
        icon: (
          <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z" />
        ),
      },
    ],
  },
  {
    label: "",
    items: [
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
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center gap-5 border-r border-border py-6">
      <Link
        href="/"
        className="flex h-10 w-10 items-center justify-center rounded-2xl btn-gradient text-sm font-bold text-accent-foreground"
      >
        H
      </Link>

      {NAV_GROUPS.map((group, i) => (
        <nav key={group.label || i} className="flex flex-col items-center gap-2">
          {group.items.map((item) => {
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
      ))}
    </aside>
  );
}
