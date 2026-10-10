import type { Metadata, Viewport } from "next";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/fraunces/600.css";
import { themeColor } from "@/design/tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "StudioFlat", template: "%s · StudioFlat" },
  description: "Class booking for small studios. One monthly price. No cut of your payments.",
  applicationName: "StudioFlat",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
