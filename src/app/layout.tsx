import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RootProviders from "@/components/providers/RootProviders";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CrispChat } from "@/components/support/CrispChat";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Need A Tradesman - Connect with Trusted Tradespeople",
    template: "%s | Need A Tradesman",
  },
  description:
    "Connect with trusted, verified tradespeople in your area. Post jobs, get competitive quotes, and hire with complete confidence.",
  keywords: ["tradesperson", "home services", "contractor", "quotes", "jobs"],
  authors: [{ name: "Need A Tradesman" }],
  creator: "Need A Tradesman",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://needatradesman.com",
    siteName: "Need A Tradesman",
    title: "Need A Tradesman - Connect with Trusted Tradespeople",
    description:
      "Connect with trusted, verified tradespeople in your area. Post jobs, get competitive quotes, and hire with complete confidence.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Need A Tradesman",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Need A Tradesman",
    description: "Connect with trusted, verified tradespeople",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/favicon/favicon-16x16.png"
          sizes="16x16"
          type="image/png"
        />
        <link
          rel="icon"
          href="/favicon/favicon-32x32.png"
          sizes="32x32"
          type="image/png"
        />
        <link
          rel="apple-touch-icon"
          href="/favicon/apple-touch-icon.png"
          sizes="180x180"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <RootProviders>
            {children}
            <CrispChat />
          </RootProviders>
          <Analytics />
        </ErrorBoundary>
      </body>
    </html>
  );
}
