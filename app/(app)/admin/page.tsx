import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  adminListUsers,
  adminMonthToDate,
  adminFailureRates,
  adminRecentGenerations,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { userId } = await auth();
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  // 404 (not 403) so the route's existence isn't advertised.
  if (!adminId || userId !== adminId) notFound();

  const [users, mtd, failures, recent] = await Promise.all([
    adminListUsers(),
    adminMonthToDate(),
    adminFailureRates(),
    adminRecentGenerations(),
  ]);

  const margin = mtd.revenue_usd - mtd.provider_cost_usd;

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <h1 className="text-2xl font-bold">Admin</h1>

        <section className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "MTD credits burned", value: `$${mtd.revenue_usd.toFixed(2)}` },
            { label: "MTD provider cost", value: `$${mtd.provider_cost_usd.toFixed(2)}` },
            {
              label: "MTD margin",
              value: `${margin >= 0 ? "+" : ""}$${margin.toFixed(2)}`,
            },
            { label: "MTD purchases", value: `$${mtd.purchases_usd.toFixed(2)}` },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl border border-border p-5">
              <p className="text-xs text-muted">{stat.label}</p>
              <p className="tabular mt-1 text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Users ({users.length})
          </h2>
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  {["Email", "Name", "Balance", "Lifetime spent", "Joined", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-2.5">{u.email ?? u.id}</td>
                    <td className="px-4 py-2.5">{u.display_name ?? "—"}</td>
                    <td className="tabular px-4 py-2.5">{u.balance_credits}</td>
                    <td className="tabular px-4 py-2.5">{u.lifetime_spent_credits}</td>
                    <td className="px-4 py-2.5">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">{u.is_banned ? "🚫 banned" : "active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Failure rate by model (7 days)
          </h2>
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  {["Model", "Total", "Failed", "Rate"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.model} className="border-t border-border">
                    <td className="px-4 py-2.5">{f.model}</td>
                    <td className="tabular px-4 py-2.5">{f.total}</td>
                    <td className="tabular px-4 py-2.5">{f.failed}</td>
                    <td className="tabular px-4 py-2.5">
                      {Number(f.total) > 0
                        ? `${((Number(f.failed) / Number(f.total)) * 100).toFixed(0)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent generations
          </h2>
          <div className="glass overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  {["When", "User", "Model", "Provider", "Status", "Credits", "Cost", "Error"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {recent.map((g) => (
                  <tr key={g.id} className="border-t border-border">
                    <td className="px-4 py-2.5">{new Date(g.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{g.user_id.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5">{g.model}</td>
                    <td className="px-4 py-2.5">{g.provider}</td>
                    <td className="px-4 py-2.5">{g.status}</td>
                    <td className="tabular px-4 py-2.5">{g.credits_charged}</td>
                    <td className="tabular px-4 py-2.5">${Number(g.est_cost_usd).toFixed(2)}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5">{g.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
