import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "nor.ai | Dashboard",
  description: "Modern SaaS Dashboard - Multi-tenant Analytics Platform",
  keywords: ["dashboard", "analytics", "saas", "multi-tenant"],
  authors: [{ name: "nor.ai" }],
  verification: {
    google: "f5c6b5af5ffc5f15",
  },
  openGraph: {
    title: "nor.ai | Dashboard",
    description: "Modern SaaS Dashboard - Multi-tenant Analytics Platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider defaultTheme="dark" storageKey="nor-ai-theme">
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
