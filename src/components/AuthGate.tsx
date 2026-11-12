"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { isPublicPath } from "@/lib/auth-cookie";
import { TimerProvider } from "@/lib/timer";
import { MusicProvider } from "./MusicProvider";
import AnatomyProvider from "./AnatomyProvider";
import Navbar from "./Navbar";
import FloatingTimer from "./FloatingTimer";
import PrivacyReturnLink from "./PrivacyReturnLink";

function Footer() {
  return <footer className="page-shell mt-16 flex flex-col gap-3 border-t border-white/10 py-7 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
    <span className="font-semibold tracking-tight text-white/60">RepVisual</span>
    <span>Exercise data: free-exercise-db (MIT).</span>
    <Link href="/privacy-policy" className="inline-flex min-h-11 items-center text-white/70 underline hover:text-white">Privacy Policy</Link>
  </footer>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = isPublicPath(pathname);
  useEffect(() => {
    if (!loading && !user && !publicPage) router.replace("/");
  }, [loading, user, publicPage, router]);
  if ((loading && pathname !== "/privacy-policy") || (!user && !publicPage)) {
    return <main className="page-shell py-12 text-white/60" role="status">{loading ? "Checking your sign-in..." : "Returning to sign-in..."}</main>;
  }
  // No app navigation, timer, music iframe or anatomy renderer for visitors.
  // Legal information is server-rendered even before auth initializes.
  if (!user && pathname !== "/privacy-policy") return <main>{children}</main>;
  if (!user || pathname === "/privacy-policy") return <>
    <header className="page-shell flex min-h-20 items-center justify-between border-b border-white/10">
      <Link href="/" className="text-xl font-bold text-white">RepVisual<span className="text-accent">.</span></Link>
      {pathname === "/privacy-policy" && <PrivacyReturnLink className="inline-flex min-h-11 items-center px-3 text-sm text-accent" />}
    </header>
    <main>{children}</main><Footer />
  </>;
  return <TimerProvider><MusicProvider><AnatomyProvider>
    <Navbar /><main>{children}</main><FloatingTimer /><Footer />
  </AnatomyProvider></MusicProvider></TimerProvider>;
}
