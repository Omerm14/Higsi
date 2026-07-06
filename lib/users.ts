import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "./db";
import { grantCredits } from "./credits";
import { SIGNUP_BONUS_CREDITS } from "./pricing";

export interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
  balance_credits: number;
  is_banned: boolean;
  created_at: string;
  last_seen_at: string;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

// Lazy upsert instead of a Clerk webhook: self-healing on every request,
// no svix dependency, nothing to misconfigure. The Clerk profile fetch
// (an extra API call) only happens on the very first insert.
export async function requireUser(): Promise<AppUser> {
  const { userId } = await auth();
  if (!userId) throw new AuthError(401, "Sign in required");

  const db = sql();
  const rows = (await db`
    insert into users (id)
    values (${userId})
    on conflict (id) do update set last_seen_at = now()
    returning *, (xmax = 0) as is_new
  `) as (AppUser & { is_new: boolean })[];
  const user = rows[0];

  if (user.is_new) {
    await grantCredits(userId, SIGNUP_BONUS_CREDITS, "signup_bonus");
    user.balance_credits += SIGNUP_BONUS_CREDITS;

    // Best-effort profile fill — identity lives in Clerk; this is only for
    // admin readability. Never fail the request over it.
    try {
      const profile = await currentUser();
      if (profile) {
        const email = profile.emailAddresses[0]?.emailAddress ?? null;
        const name = profile.fullName ?? profile.username ?? null;
        await db`update users set email = ${email}, display_name = ${name} where id = ${userId}`;
      }
    } catch {
      // ignore
    }
  }

  if (user.is_banned) throw new AuthError(403, "Account disabled");
  return user;
}

export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  return null;
}
