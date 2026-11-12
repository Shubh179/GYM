import type { Session } from "@supabase/supabase-js";

export const AUTH_COOKIE = "repvisual-access-token";
export const PUBLIC_PATHS = ["/", "/account", "/privacy-policy"];
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

// The existing Supabase client retains/refreshes the session in localStorage.
// Mirror only its short-lived access token so server requests can be verified.
// A cookie's presence is never treated as proof of authentication.
export function writeAuthCookie(session: Session | null): void {
  const maxAge = session ? Math.max(0, (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) - Math.floor(Date.now() / 1000)) : 0;
  document.cookie = `${AUTH_COOKIE}=${session ? encodeURIComponent(session.access_token) : ""}; Path=/; Max-Age=${maxAge}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}
