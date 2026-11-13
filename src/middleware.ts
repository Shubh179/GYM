import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isPublicPath } from "./lib/auth-cookie";

function reject(request: NextRequest, invalid = false) {
  const api = request.nextUrl.pathname.startsWith("/api/");
  const login = new URL("/", request.url);
  if (invalid) login.searchParams.set("auth", "required");
  const response = api
    ? NextResponse.json({ error: "Sign in to access RepVisual." }, { status: 401 })
    : NextResponse.redirect(login);
  response.headers.set("Cache-Control", "private, no-store");
  if (invalid) response.cookies.delete(AUTH_COOKIE);
  return response;
}

function unavailable() {
  return NextResponse.json({ error: "Sign-in verification is temporarily unavailable. Please try again." }, {
    status: 503, headers: { "Cache-Control": "private, no-store" },
  });
}

export async function middleware(request: NextRequest) {
  if (["/music", "/spotify", "/api/music-test"].some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) {
    return new NextResponse(null, { status: 404 });
  }
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim() : request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return reject(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return unavailable();
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
    });
    // Supabase validates the JWT. Neither a forged cookie nor client UI state
    // can unlock server-rendered pages, RSC responses or API handlers.
    const { data, error } = await client.auth.getUser(token);
    if (error && (!error.status || error.status >= 500)) return unavailable();
    if (error || !data.user) return reject(request, true);
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return unavailable(); }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
