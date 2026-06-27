export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // SAM.gov Exclusions API — free key from sam.gov → Account Details → Generate Personal API Key
  samGovApiKey: process.env.SAM_GOV_API_KEY ?? "",
  // Canonical app URL used for server-generated links and Stripe redirect validation
  appUrl: process.env.APP_URL || "https://www.useauditready.com",
};

/**
 * Validate that a browser-supplied origin is an allowed Stripe redirect destination.
 * Prevents open-redirect attacks where a forged origin could redirect users to
 * an attacker-controlled domain after checkout.
 *
 * In production only the canonical domain is allowed.
 * In development we also accept localhost and the Manus preview domain.
 */
export function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Always allow the canonical production domain
    if (hostname === "www.useauditready.com" || hostname === "useauditready.com") return true;
    if (hostname === "auditready-esm9eowa.manus.space") return true;

    // In development, also allow localhost and Manus preview URLs
    if (!ENV.isProduction) {
      if (hostname === "localhost" || hostname === "127.0.0.1") return true;
      if (hostname.endsWith(".manus.computer")) return true;
    }

    return false;
  } catch {
    return false;
  }
}
