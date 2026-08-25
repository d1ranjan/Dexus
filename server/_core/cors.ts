import type { RequestHandler } from "express";

function normalizeOrigin(value: string): string | undefined {
  try {
    const origin = new URL(value).origin;
    return origin.startsWith("https://") || origin.startsWith("http://") ? origin : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parses the server-only CORS allow-list. Origins are intentionally exact: a
 * path, wildcard, or similarly named host cannot authorize browser requests.
 */
export function getAllowedCorsOrigins(rawValue = process.env.CORS_ALLOWED_ORIGINS): Set<string> {
  return new Set(
    (rawValue ?? "")
      .split(",")
      .map((value) => normalizeOrigin(value.trim()))
      .filter((value): value is string => Boolean(value)),
  );
}

export function isAllowedCorsOrigin(origin: string | undefined, allowedOrigins: Set<string>): boolean {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
  return Boolean(normalizedOrigin && allowedOrigins.has(normalizedOrigin));
}

/**
 * Allows credentialed browser requests only from the server-configured web
 * origins. Native requests normally omit Origin and continue through token
 * authentication; unknown browser origins receive no permissive CORS headers.
 */
export function createCorsMiddleware(
  allowedOrigins = getAllowedCorsOrigins(),
): RequestHandler {
  return (req, res, next) => {
    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const originAllowed = isAllowedCorsOrigin(requestOrigin, allowedOrigins);

    if (originAllowed && requestOrigin) {
      const normalizedOrigin = new URL(requestOrigin).origin;
      res.header("Access-Control-Allow-Origin", normalizedOrigin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(requestOrigin && !originAllowed ? 403 : 204);
      return;
    }

    next();
  };
}
