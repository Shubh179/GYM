import "server-only";
import { createClient } from "@supabase/supabase-js";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim());
}

export function requiresExerciseSignIn(): boolean {
  return supabaseConfigured() || process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

export class ExerciseStorageUnavailableError extends Error {
  constructor() { super("Exercise storage is not available. Please try again later."); }
}

export function createServerSupabase(privileged = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = privileged ? process.env.SUPABASE_SECRET_KEY?.trim() : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new ExerciseStorageUnavailableError();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(10000) }),
    },
  });
}

export interface ExerciseAccess {
  requiresAuth: boolean;
  configured: boolean;
  signedIn: boolean;
  canCreate: boolean;
  email?: string;
}

export async function exerciseAccess(authorization: string | null): Promise<ExerciseAccess> {
  const requiresAuth = requiresExerciseSignIn();
  if (!requiresAuth) return { requiresAuth: false, configured: true, signedIn: false, canCreate: true };
  const adminEmail = process.env.CUSTOM_EXERCISE_ADMIN_EMAIL?.trim().toLowerCase();
  const configured = Boolean(supabaseConfigured() && process.env.SUPABASE_SECRET_KEY?.trim() && adminEmail);
  const denied: ExerciseAccess = { requiresAuth: true, configured, signedIn: false, canCreate: false };
  if (!configured || !authorization?.startsWith("Bearer ")) return denied;
  const token = authorization.slice(7).trim();
  if (!token) return denied;
  try {
    const { data, error } = await createServerSupabase().auth.getUser(token);
    if (error || !data.user) return denied;
    const user = data.user;
    return {
      requiresAuth: true, configured: true, signedIn: true, email: user.email,
      canCreate: Boolean(user.email_confirmed_at && user.email?.toLowerCase() === adminEmail),
    };
  } catch {
    return denied;
  }
}
