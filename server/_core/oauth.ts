import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";

import { getSessionCookieOptions } from "./cookies";
import { getAllowedCorsOrigins, isAllowedCorsOrigin } from "./cors";
import { ENV } from "./env";
import { sdk } from "./sdk";

type SupabaseSessionResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
  message?: string;
  error_description?: string;
  msg?: string;
};

function authErrorMessage(payload: SupabaseSessionResponse, fallback: string) {
  return payload.message || payload.error_description || payload.msg || fallback;
}

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isStrongEnoughPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 256;
}

export function isAllowedDexusRedirect(
  origin: string | undefined,
  value: unknown,
  allowedOrigins = getAllowedCorsOrigins(),
  webAppUrl = process.env.WEB_APP_URL,
) {
  if (typeof value !== "string") return undefined;
  const redirectUrl = value.trim();
  if (/^dexusdexusmobilev2:\/\//.test(redirectUrl)) return redirectUrl;
  if (!isAllowedCorsOrigin(origin, allowedOrigins)) return undefined;
  const normalizedOrigin = new URL(origin!).origin;
  if (redirectUrl === `${normalizedOrigin}/auth/callback`) return redirectUrl;
  const normalizedWebAppUrl = webAppUrl?.trim().replace(/\/$/, "");
  if (normalizedWebAppUrl && new URL(normalizedWebAppUrl).origin === normalizedOrigin && redirectUrl === `${normalizedWebAppUrl}/auth/callback`) return redirectUrl;
  return undefined;
}

function allowedRedirectUrl(req: Request, value: unknown) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  return isAllowedDexusRedirect(origin, value);
}

async function supabaseAuthRequest(path: string, options: RequestInit) {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw new Error("Dexus authentication is not configured.");
  const response = await fetch(`${ENV.supabaseUrl.replace(/\/+$/, "")}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: ENV.supabasePublishableKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as SupabaseSessionResponse;
  return { response, payload };
}

function userResponse(user: Awaited<ReturnType<typeof sdk.authenticateRequest>>) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    role: user.role,
    accountStatus: user.accountStatus,
    lastSignedIn: user.lastSignedIn.toISOString(),
  };
}

/**
 * Dexus authentication routes accept a Supabase access token, verify it on the
 * server, resolve it to a stable Dexus user, and optionally establish a web
 * cookie. They intentionally do not expose provider secrets or mint client
 * identities from unverified request fields.
 */
export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/sign-up", async (req: Request, res: Response) => {
    const { email, password, name, redirectTo } = req.body ?? {};
    if (!isEmail(email) || !isStrongEnoughPassword(password)) {
      res.status(400).json({ error: "Enter a valid email address and a password with at least 8 characters." });
      return;
    }
    const redirectUrl = allowedRedirectUrl(req, redirectTo);
    if (!redirectUrl) {
      res.status(400).json({ error: "Dexus could not validate this email verification destination." });
      return;
    }
    try {
      const { response, payload } = await supabaseAuthRequest("/signup", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          data: typeof name === "string" && name.trim() ? { full_name: name.trim().slice(0, 120) } : {},
          gotrue_meta_security: {},
          redirect_to: redirectUrl,
        }),
      });
      if (!response.ok) {
        res.status(response.status === 429 ? 429 : 400).json({ error: authErrorMessage(payload, "Dexus could not create this account.") });
        return;
      }
      res.status(200).json({ needsEmailVerification: !payload.access_token });
    } catch {
      res.status(503).json({ error: "Dexus could not reach its authentication service. Please try again shortly." });
    }
  });

  app.post("/api/auth/sign-in", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!isEmail(email) || typeof password !== "string") {
      res.status(400).json({ error: "Enter your email address and password." });
      return;
    }
    try {
      const { response, payload } = await supabaseAuthRequest("/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!response.ok || !payload.access_token || !payload.refresh_token) {
        res.status(response.status === 429 ? 429 : 401).json({ error: authErrorMessage(payload, "Your email or password is incorrect.") });
        return;
      }
      res.json({
        session: {
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          expires_in: payload.expires_in,
          expires_at: payload.expires_at,
          token_type: payload.token_type,
        },
      });
    } catch {
      res.status(503).json({ error: "Dexus could not reach its authentication service. Please try again shortly." });
    }
  });

  app.post("/api/auth/recover", async (req: Request, res: Response) => {
    const { email, redirectTo } = req.body ?? {};
    if (!isEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }
    const redirectUrl = allowedRedirectUrl(req, redirectTo);
    if (!redirectUrl) {
      res.status(400).json({ error: "Dexus could not validate this password reset destination." });
      return;
    }
    try {
      // Always return the same success response to avoid revealing whether an
      // email address has a Dexus account.
      await supabaseAuthRequest("/recover", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirect_to: redirectUrl }),
      });
      res.json({ success: true });
    } catch {
      res.status(503).json({ error: "Dexus could not reach its authentication service. Please try again shortly." });
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== "string" || refreshToken.length < 20) {
      res.status(400).json({ error: "A valid session refresh token is required." });
      return;
    }
    try {
      const { response, payload } = await supabaseAuthRequest("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok || !payload.access_token || !payload.refresh_token) {
        res.status(401).json({ error: "Your Dexus session has expired. Please sign in again." });
        return;
      }
      res.json({ session: { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_in: payload.expires_in, expires_at: payload.expires_at, token_type: payload.token_type } });
    } catch {
      res.status(503).json({ error: "Dexus could not refresh this session. Please try again shortly." });
    }
  });

  app.post("/api/auth/password", async (req: Request, res: Response) => {
    const { password } = req.body ?? {};
    const header = req.headers.authorization ?? req.headers.Authorization;
    if (!isStrongEnoughPassword(password) || typeof header !== "string" || !header.startsWith("Bearer ")) {
      res.status(400).json({ error: "Use a password with at least 8 characters and an active Dexus session." });
      return;
    }
    try {
      const { response, payload } = await supabaseAuthRequest("/user", {
        method: "PUT",
        headers: { Authorization: header },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        res.status(response.status === 401 ? 401 : 400).json({ error: authErrorMessage(payload, "Dexus could not update your password.") });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(503).json({ error: "Dexus could not reach its authentication service. Please try again shortly." });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const header = req.headers.authorization ?? req.headers.Authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      try {
        await supabaseAuthRequest("/logout", { method: "POST", headers: { Authorization: header } });
      } catch {
        // Local sign-out must still succeed if the upstream provider is briefly unavailable.
      }
    }
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      res.json({ user: userResponse(await sdk.authenticateRequest(req)) });
    } catch (error) {
      console.warn("[Auth] /api/auth/me rejected request", error instanceof Error ? error.message : String(error));
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const header = req.headers.authorization ?? req.headers.Authorization;
      if (typeof header !== "string" || !header.startsWith("Bearer ")) {
        res.status(400).json({ error: "A Supabase bearer token is required." });
        return;
      }
      const token = header.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      // The bearer token itself remains short-lived and is re-verified by the
      // server, even if this convenience cookie persists longer.
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: userResponse(user) });
    } catch (error) {
      console.warn("[Auth] /api/auth/session rejected request", error instanceof Error ? error.message : String(error));
      res.status(401).json({ error: "Invalid or unverified Supabase session." });
    }
  });
}
