import type { CookieOptions, Request } from "express";
import { ENV } from "./env";

function isSecureRequest(req: Request): boolean {
  // In production this app is only ever served over HTTPS (see ENV.appUrl).
  // Trust that directly instead of relying solely on a reverse proxy correctly
  // forwarding x-forwarded-proto — if that header is ever missing or wrong,
  // `secure` silently resolves to false while `sameSite` stays "none", and
  // browsers drop the cookie with no visible error at all.
  if (ENV.isProduction) return true;

  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
