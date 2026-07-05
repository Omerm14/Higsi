import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Sidebar from "./sidebar";
import CreditBalance from "./credit-balance";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border px-6">
          <CreditBalance />
          <Link
            href="/pricing"
            className="btn-gradient rounded-full px-4 py-1.5 text-xs font-semibold text-accent-foreground"
          >
            Buy credits
          </Link>
          <UserButton />
        </header>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
