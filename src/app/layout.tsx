import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LibraryProvider } from "@/lib/library";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepVisual — See how to perform any gym exercise",
  description:
    "Search any gym exercise and watch an animated demonstration of the full rep: start position, movement, and finish — plus muscles worked and technique tips.",
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
          <Navbar />
          <main>{children}</main>
          <footer className="mt-20 border-t border-white/10 px-5 py-8 text-center text-xs text-white/30">
            Exercise data from free-exercise-db (MIT). Images via jsDelivr CDN.
            AI breakdowns by Claude.
          </footer>
        </LibraryProvider>
      </body>
    </html>
  );
}
