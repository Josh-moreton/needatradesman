import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { ThemeProvider } from "next-themes";

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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#2E6B83", // Teal Blue
          colorDanger: "#E74C3C", // Red for error states
          colorSuccess: "#27AE60", // Green for success states
          colorWarning: "#E9A928", // Bright Yellow/Gold
          colorNeutral: "#2B3A42", // Charcoal Grey
          colorText: "#1C2E3A", // Dark Navy Blue
          colorTextSecondary: "#2B3A42", // Charcoal Grey
          colorTextOnPrimaryBackground: "#FFFFFF", // White
          colorBackground: "#FFFFFF", // White
          colorInputText: "#1C2E3A", // Dark Navy
          colorInputBackground: "#F5F3EE", // Light Cream
          colorShimmer: "#F5F3EE", // Light Cream
          fontFamily: "inherit",
          fontFamilyButtons: "inherit",
          fontSize: "0.8125rem",
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          },
          borderRadius: "0.375rem",
          spacingUnit: "1rem",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            <main className="min-h-screen">{children}</main>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
