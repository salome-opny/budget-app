import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorker from "@/components/ServiceWorker";
import { withBase } from "@/lib/basePath";

export const metadata: Metadata = {
  title: "Budget",
  description: "Personal income and expense tracker. Your data stays on this device.",
  appleWebApp: {
    capable: true,
    title: "Budget",
    statusBarStyle: "default",
  },
  icons: {
    icon: withBase("/icon-192.png"),
    apple: withBase("/apple-touch-icon.png"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-text">
        <ServiceWorker />
        <main className="mx-auto w-full max-w-lg px-4 pb-28 safe-top">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
