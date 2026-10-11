import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-ink-950">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 6.5h2v11h-2zM15.5 6.5h2v11h-2zM3 9h2v6H3zM19 9h2v6h-2zM8 11h8v2H8z" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Rep<span className="text-lime">Visual</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/search" className="text-white/60 transition hover:text-white">
            Browse
          </Link>
          <Link
            href="/search?q=chest"
            className="hidden text-white/60 transition hover:text-white sm:block"
          >
            By Muscle
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 rounded-xl border border-lime/40 bg-lime/10 px-3 py-1.5 font-semibold text-lime transition hover:bg-lime/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7.5-4.9-10-9.3C.6 9 1.4 5.6 4.3 4.5 6.3 3.7 8.6 4.4 10 6c.4.5.7 1 1 1.5.3-.5.6-1 1-1.5 1.4-1.6 3.7-2.3 5.7-1.5 2.9 1.1 3.7 4.5 2.3 7.2C19.5 16.1 12 21 12 21z" />
            </svg>
            My Training
          </Link>
        </nav>
      </div>
    </header>
  );
}
