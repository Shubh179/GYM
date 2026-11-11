"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTimer } from "@/lib/timer";

const links = [
  { href: "/library", label: "My Training", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
  { href: "/search", label: "Browse", icon: "M21 21l-5-5M18 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0" },
  { href: "/favourites", label: "Favourites", icon: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8" },
  { href: "/timer", label: "Timer", icon: "M9 2h6M12 8v5l3 2M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0" },
  { href: "/music", label: "Music", icon: "M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3h3M21 16a3 3 0 1 1-3-3h3" },
];
export default function Navbar() {
  const pathname = usePathname();
  const { hydrated, hasActiveTimer } = useTimer();
  return <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/95 backdrop-blur-md">
    <div className="page-shell lg:flex lg:h-[76px] lg:items-center lg:justify-between lg:gap-8">
      <div className="app-brand-row flex h-16 items-center justify-between lg:h-auto">
        <Link href="/library" aria-label="RepVisual home" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-ink-950">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8v8M7 5v14M17 5v14M21 8v8M7 12h10" /></svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-white">RepVisual<span className="ml-1 text-accent">.</span></span>
        </Link>
        <Link href="/account" className="ml-4 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-3 text-sm text-white/70">Account</Link>
      </div>
      <nav aria-label="Main navigation" className="grid grid-cols-5 gap-1 pb-2 lg:flex lg:gap-1 lg:pb-0">
        {links.map(link => {
          const active = pathname === link.href || (link.href === "/search" && pathname.startsWith("/exercise/"));
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
            className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition sm:text-xs lg:min-h-11 lg:flex-row lg:gap-2 lg:px-4 lg:text-sm ${active ? "bg-white/[0.06] text-accent" : "text-white/60 hover:bg-white/[0.04] hover:text-white"}`}>
            <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon} /></svg>
            <span className="whitespace-nowrap">{link.label}</span>
            {link.href === "/timer" && hydrated && hasActiveTimer && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
          </Link>;
        })}
      </nav>
    </div>
  </header>;
}
