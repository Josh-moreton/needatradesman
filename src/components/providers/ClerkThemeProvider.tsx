"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

interface ClerkThemeProviderProps {
  children: ReactNode;
}

export default function ClerkThemeProvider({
  children,
}: Readonly<ClerkThemeProviderProps>) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Define Clerk variables for both themes
  const light = {
    colorPrimary: "#2E6B83",
    colorDanger: "#E74C3C",
    colorSuccess: "#27AE60",
    colorWarning: "#E9A928",
    colorNeutral: "#2B3A42",
    colorText: "#1C2E3A",
    colorTextSecondary: "#2B3A42",
    colorTextOnPrimaryBackground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorInputText: "#1C2E3A",
    colorInputBackground: "#F5F3EE",
    colorShimmer: "#F5F3EE",
    fontFamily: "inherit",
    fontFamilyButtons: "inherit",
    fontSize: "0.8125rem",
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    borderRadius: "0.375rem",
    spacingUnit: "1rem",
  };
  const dark = {
    colorPrimary: "#E9A928",
    colorDanger: "#E74C3C",
    colorSuccess: "#27AE60",
    colorWarning: "#E9A928",
    colorNeutral: "#2E6B83",
    colorText: "#F5F3EE",
    colorTextSecondary: "#FFFFFF",
    colorTextOnPrimaryBackground: "#1C2E3A",
    colorBackground: "#2B3A42",
    colorInputText: "#F5F3EE",
    colorInputBackground: "#1C2E3A",
    colorShimmer: "#2E6B83",
    fontFamily: "inherit",
    fontFamilyButtons: "inherit",
    fontSize: "0.8125rem",
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    borderRadius: "0.375rem",
    spacingUnit: "1rem",
  };

  // Only use resolved theme after mount to prevent hydration mismatch
  const variables = mounted && resolvedTheme === "dark" ? dark : light;

  return <ClerkProvider appearance={{ variables }}>{children}</ClerkProvider>;
}
