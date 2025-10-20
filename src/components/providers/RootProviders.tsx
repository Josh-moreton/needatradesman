"use client";

import { ThemeProvider } from "next-themes";
import ClerkThemeProvider from "@/components/providers/ClerkThemeProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Toaster } from "sonner";
import { ReactNode } from "react";
import { UserRole } from "@prisma/client";

interface RootProvidersProps {
  children: ReactNode;
  userRole?: UserRole | null;
}

export default function RootProviders({ children, userRole = null }: RootProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ClerkThemeProvider>
        <Header userRole={userRole} />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <Toaster position="top-center" />
      </ClerkThemeProvider>
    </ThemeProvider>
  );
}
