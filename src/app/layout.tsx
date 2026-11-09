import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MusicProvider } from "@/components/MusicProvider";
import Navbar from "@/components/Navbar";
import FloatingTimer from "@/components/FloatingTimer";
import { LibraryProvider } from "@/lib/library";
import { TimerProvider } from "@/lib/timer";
import AnatomyProvider from "@/components/AnatomyProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepVisual — Exercise Browser and Training Planner",
  description:
    "Browse exercise demonstrations, plan workouts, track your progress, and explore specific muscle targets in 3D.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <LibraryProvider>
          <TimerProvider>
            <MusicProvider>
            <AnatomyProvider>
            <Navbar />
            <main>{children}</main>
            <FloatingTimer />
            <footer className="page-shell mt-16 flex flex-col gap-3 border-t border-white/10 py-7 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold tracking-tight text-white/60">RepVisual</span>
              <span>Exercise data: free-exercise-db (MIT).</span>
            </footer>
            </AnatomyProvider>
            </MusicProvider>
          </TimerProvider>
        </LibraryProvider>
      </body>
    </html>
  );
}
