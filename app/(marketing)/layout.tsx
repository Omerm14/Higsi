import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { BRAND } from "@/lib/brand";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="btn-gradient flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-accent-foreground">
              {BRAND.logoLetter}
            </span>
            <span className="text-sm font-semibold tracking-wide">{BRAND.name}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-muted transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Show
              when="signed-in"
              fallback={
                <>
                  <Link href="/sign-in" className="text-muted transition-colors hover:text-foreground">
                    Sign in
                  </Link>
                  <Link
                    href="/sign-up"
                    className="btn-gradient rounded-full px-4 py-2 text-xs font-semibold text-accent-foreground"
                  >
                    Start free
                  </Link>
                </>
              }
            >
              <Link
                href="/dashboard"
                className="btn-gradient rounded-full px-4 py-2 text-xs font-semibold text-accent-foreground"
              >
                Open studio
              </Link>
            </Show>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-border py-10 text-center text-xs text-muted-2">
        © {new Date().getFullYear()} {BRAND.name}. All generations are yours to use commercially.
      </footer>
    </div>
  );
}
