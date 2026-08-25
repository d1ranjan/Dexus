import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Cookies default to the exact API host. Parent-domain sharing is permitted
 * only when an owner explicitly configures a domain they control. This avoids
 * attempting to scope sessions to shared public suffixes such as onrender.com.
 */
function getConfiguredCookieDomain(hostname: string): string | undefined {
  const candidate = process.env.COOKIE_DOMAIN?.trim().toLowerCase().replace(/^\./, "");
  if (!candidate || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) return undefined;
  if (hostname !== candidate && !hostname.endsWith(`.${candidate}`)) return undefined;
  return `.${candidate}`;
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const domain = getConfiguredCookieDomain(hostname);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
