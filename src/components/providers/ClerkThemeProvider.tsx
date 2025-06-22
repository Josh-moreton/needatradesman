"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { ReactNode } from "react";

interface ClerkThemeProviderProps {
  children: ReactNode;
}

export default function ClerkThemeProvider({
  children,
}: ClerkThemeProviderProps) {
  const { resolvedTheme } = useTheme();

  // Light theme variables
  const lightThemeVariables = {
    // Primary brand colors
    colorPrimary: "#2E6B83", // Teal Blue - primary actions, buttons, links
    colorDanger: "#E74C3C", // Red for error states
    colorSuccess: "#27AE60", // Green for success states
    colorWarning: "#E9A928", // Bright Yellow/Gold for warnings
    colorNeutral: "#2B3A42", // Charcoal Grey for neutral elements

    // Text colors
    colorText: "#1C2E3A", // Dark Navy Blue for primary text
    colorTextSecondary: "#2B3A42", // Charcoal Grey for secondary text
    colorTextOnPrimaryBackground: "#FFFFFF", // White text on primary background

    // Background colors
    colorBackground: "#FFFFFF", // White for card backgrounds
    colorInputBackground: "#F5F3EE", // Light Cream for input backgrounds
    colorInputText: "#1C2E3A", // Dark Navy for input text

    // Other properties
    colorShimmer: "#F5F3EE", // Light Cream for loading states

    // Typography
    fontFamily: "inherit", // Use app's font family
    fontFamilyButtons: "inherit", // Use app's font family for buttons
    fontSize: "0.875rem", // 14px - slightly larger than default
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    // Layout
    borderRadius: "0.5rem", // 8px to match our design system
    spacingUnit: "1rem", // 16px spacing unit
  };

  // Dark theme variables
  const darkThemeVariables = {
    colorPrimary: "#E9A928", // Bright Yellow/Gold - primary in dark mode
    colorDanger: "#E74C3C", // Red for error states
    colorSuccess: "#27AE60", // Green for success states
    colorWarning: "#E9A928", // Bright Yellow/Gold for warnings
    colorNeutral: "#2E6B83", // Teal Blue for neutral elements in dark mode

    // Text colors
    colorText: "#F5F3EE", // Light Cream for primary text
    colorTextSecondary: "#FFFFFF", // White for secondary text
    colorTextOnPrimaryBackground: "#1C2E3A", // Dark Navy text on primary background

    // Background colors
    colorBackground: "#2B3A42", // Charcoal Grey for card backgrounds
    colorInputBackground: "#1C2E3A", // Dark Navy for input backgrounds
    colorInputText: "#F5F3EE", // Light Cream for input text

    // Other properties
    colorShimmer: "#2E6B83", // Teal Blue for loading states
    fontFamily: "inherit",
    fontFamilyButtons: "inherit",
    borderRadius: "0.5rem",
    spacingUnit: "1rem",
  };

  const variables =
    resolvedTheme === "dark" ? darkThemeVariables : lightThemeVariables;

  return (
    <ClerkProvider
      appearance={{
        variables,
      }}
    >
      {children}
    </ClerkProvider>
  );
}
