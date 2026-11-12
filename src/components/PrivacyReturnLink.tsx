"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function PrivacyReturnLink({ className }: { className?: string }) {
  const { user } = useAuth();
  return <Link href={user ? "/library" : "/"} className={className}>{user ? "Back" : "Sign in"}</Link>;
}
