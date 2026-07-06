import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          // Mirrors app/globals.css's design tokens (:root) so every
          // Clerk-rendered screen — sign-in, sign-up, the account popup —
          // reads as part of Higsi rather than a bolted-on widget.
          colorPrimary: "#a855f7", // --accent-a
          colorPrimaryForeground: "#ffffff", // --accent-foreground
          colorBackground: "#111114", // solid card bg, close to --background
          colorForeground: "#f4f4f6", // --foreground
          colorInput: "#1a1a1f", // solid approx of --surface-2
          colorInputForeground: "#f4f4f6",
          colorNeutral: "#8d8d99", // --muted
          colorBorder: "#232329", // solid approx of --border
          colorDanger: "#fb7185", // --danger
          colorSuccess: "#34d399", // --success
          colorWarning: "#fbbf24", // --warning
          colorRing: "#a855f7", // focus ring matches primary
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          fontFamilyButtons: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          borderRadius: "1rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="bg-app-glow text-foreground">{children}</body>
      </html>
    </ClerkProvider>
  );
}
