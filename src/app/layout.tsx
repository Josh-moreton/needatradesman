import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { ThemeProvider } from "next-themes";
import ClerkThemeProvider from "@/components/providers/ClerkThemeProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Need A Tradesman - Connect with Trusted Tradespeople",
  description:
    "Find skilled tradespeople for your home projects. Post jobs, get quotes, and hire with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkThemeProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Toaster position="top-center" />
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
