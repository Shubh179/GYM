"use client";
import { createClient } from "@supabase/supabase-js";
import { browserSupabase } from "./supabase-browser";
// Pin every operation to its initiating account, including uploads that finish
// after a sign-out/account switch. RLS still verifies the JWT on the server.
export async function sharingClient(expectedUserId: string) {
  const browser = browserSupabase(); if (!browser) throw Error("Sharing unavailable.");
  const { data, error } = await browser.auth.getSession();
  if (error || !data.session || data.session.user.id !== expectedUserId) throw Error("Your account changed. Please reload and try again.");
  const token = data.session.access_token;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { accessToken: async () => token });
}
