import { NextResponse } from "next/server";
import { listStuckGenerations } from "@/lib/db";
import { settleGeneration, failAndRefund } from "@/lib/jobs";
import { sql } from "@/lib/db";

// Safety net behind client polling: no browser open, crashed submits, and
// provider tasks that never terminate all get settled (and refunded) here.
// Runs every minute via vercel.json crons; guarded by CRON_SECRET since
// the route is public in the proxy (Vercel Cron can't sign in).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stuck = await listStuckGenerations();
  const results: { id: string; action: string }[] = [];

  for (const generation of stuck) {
    try {
      const ageMs = Date.now() - new Date(generation.created_at).getTime();

      // Charged but never submitted (crash between deduct and submit).
      if (!generation.provider_task_id) {
        await failAndRefund(generation, "Job was never submitted — you were not charged.");
        results.push({ id: generation.id, action: "refunded_unsubmitted" });
        continue;
      }

      // Hard timeout: nothing takes half an hour; assume dead and refund.
      if (ageMs > 30 * 60 * 1000) {
        await failAndRefund(generation, "Job timed out — you were not charged.");
        results.push({ id: generation.id, action: "refunded_timeout" });
        continue;
      }

      const settled = await settleGeneration(generation);
      results.push({ id: generation.id, action: `settled_${settled.status}` });
    } catch (err) {
      console.error(`Reconcile failed for ${generation.id}:`, err);
      results.push({ id: generation.id, action: "error" });
    }
  }

  // Housekeeping: fixed-window counters older than 2 days are dead weight.
  const db = sql();
  await db`delete from rate_limits where window_start < now() - interval '2 days'`;

  return NextResponse.json({ checked: stuck.length, results });
}
