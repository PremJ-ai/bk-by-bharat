import { env } from "./env.js";

export const IS_PROD = env.NODE_ENV === "production";

// __Host- prefix requires https: protocol in browser
export const SESSION_COOKIE_NAME = IS_PROD ? "__Host-store_session" : "store_session";
export const CSRF_COOKIE_NAME = IS_PROD ? "__Host-store_csrf" : "store_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export const SESSION_TTL_DAYS = 7;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const RATE_LIMIT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_LOGIN_MAX = 5;

export const RATE_LIMIT_API_WINDOW_MS = 1 * 60 * 1000;
export const RATE_LIMIT_API_MAX = 100;
