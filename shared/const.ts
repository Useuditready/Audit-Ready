export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const SESSION_HARD_CEILING_MS = 1000 * 60 * 60 * 12; // 12 hours — absolute session lifetime (enforced via JWT exp + sessions.expiresAt)
export const SESSION_IDLE_LIMIT_MS = 1000 * 60 * 30; // 30 minutes — inactivity timeout (enforced via sessions.lastActivityAt)
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
export const READ_ONLY_ERR_MSG = 'Your account is in view-only mode. Please subscribe to make changes (10003)';
