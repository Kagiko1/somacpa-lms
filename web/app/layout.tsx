import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "SomaCPA — KASNEB CPA Exam Prep",
  description:
    "Mobile-first CPA exam prep for KASNEB candidates: notes, audio lessons, quizzes and mock exams. Low-data mode, offline PWA, M-Pesa checkout.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SomaCPA" },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
