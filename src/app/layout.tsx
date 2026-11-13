import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LibraryProvider } from "@/lib/library";
import AuthProvider from "@/components/AuthProvider";
import AuthGate from "@/components/AuthGate";
import ProfileProvider from "@/components/ProfileProvider";

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
        <AuthProvider>
          <ProfileProvider><LibraryProvider>
            <AuthGate>{children}</AuthGate>
          </LibraryProvider></ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
