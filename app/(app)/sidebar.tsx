"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";

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
    label: "",
    items: [
      {
        href: "/dashboard",
        label: "Home",
        icon: (
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
        ),
      },
      {
        href: "/create",
        label: "Create",
        icon: (
          // Magic wand — the guided Eve flow
          <path
            d="M15 4V2M15 10V8M11 6h2M17 6h2M6 21l10.5-10.5a1.5 1.5 0 00-2.12-2.12L3.88 18.88 6 21zM19 15v2M18 16h2M9 3v2M8 4h2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      },
    ],
  },
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
      {
        href: "/create/3d",
        label: "3D",
        icon: (
          <path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2zM12 2v20M3.5 7l8.5 5 8.5-5" strokeLinejoin="round" />
        ),
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        href: "/tools/upscale",
        label: "Upscale",
        icon: (
          <path d="M4 14v6h6M20 10V4h-6M20 4l-7 7M4 20l7-7" strokeLinejoin="round" />
        ),
      },
      {
        href: "/tools/background-removal",
        label: "Cutout",
        icon: (
          <path
            d="M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6zM6 9v6M20 5L8.5 16.5M15 15l5 5M15 20l5-5"
            strokeLinejoin="round"
          />
        ),
      },
      {
        href: "/tools/outpaint",
        label: "Outpaint",
        icon: (
          <>
            <rect x="7" y="7" width="10" height="10" rx="1" />
            <path
              d="M3 3v4M3 3h4M21 3v4M21 3h-4M3 21v-4M3 21h4M21 21v-4M21 21h-4"
              strokeLinecap="round"
            />
          </>
        ),
      },
      {
        href: "/tools/faceswap",
        label: "Faceswap",
        icon: (
          <>
            <circle cx="8" cy="10" r="4" />
            <circle cx="16" cy="14" r="4" />
          </>
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

const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: (
    <>
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const groups = isAdmin
    ? [...NAV_GROUPS, { label: "", items: [ADMIN_ITEM] }]
    : NAV_GROUPS;

  return (
    <aside className="flex w-[76px] shrink-0 flex-col items-center gap-5 border-r border-border py-6">
      <Link
        href="/dashboard"
        className="flex h-10 w-10 items-center justify-center rounded-2xl btn-gradient text-sm font-bold text-accent-foreground"
      >
        {BRAND.logoLetter}
      </Link>

      {groups.map((group, i) => (
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
