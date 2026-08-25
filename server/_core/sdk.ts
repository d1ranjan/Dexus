import { COOKIE_NAME } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";

import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type SupabaseAuthUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: { full_name?: string; name?: string } | null;
};

function bearerToken(req: Request) {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return undefined;
}

function cookieToken(req: Request) {
  const parsed = parseCookieHeader(req.headers.cookie ?? "");
  return parsed[COOKIE_NAME];
}

/**
 * Verify each user token directly with Supabase Auth. This supports Supabase
 * projects using either asymmetric signing keys or legacy shared-secret JWTs
 * without copying a signing secret into Dexus.
 */
export async function verifySupabaseAccessToken(accessToken: string): Promise<db.VerifiedSupabaseIdentity> {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw ForbiddenError("Dexus authentication is not configured.");
  const response = await fetch(`${ENV.supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: ENV.supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw ForbiddenError("Your Dexus session is invalid or expired.");
  const user = (await response.json()) as SupabaseAuthUser;
  const subject = user.id?.trim();
  const email = user.email?.trim().toLowerCase();
  if (!subject || !email) throw ForbiddenError("Supabase did not return a valid Dexus identity.");
  if (!user.email_confirmed_at) throw ForbiddenError("Verify your email before accessing Dexus.");
  const metadata = user.user_metadata ?? {};
  const name = typeof metadata.full_name === "string" ? metadata.full_name.trim() || null : typeof metadata.name === "string" ? metadata.name.trim() || null : null;
  return { subject, email, name };
}

class DexusAuthServer {
  async authenticateRequest(req: Request): Promise<User> {
    const token = bearerToken(req) ?? cookieToken(req);
    if (!token) throw ForbiddenError("Sign in to Dexus to continue.");
    const identity = await verifySupabaseAccessToken(token);
    return db.resolveSupabaseIdentity(identity);
  }
}

export const sdk = new DexusAuthServer();
