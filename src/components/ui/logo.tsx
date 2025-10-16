"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type LogoVariant = "black" | "white" | "teal" | "yellow" | "auto";
export type LogoSize = "sm" | "md" | "lg" | "xl" | "hero";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: { width: 120, height: 40 },
  md: { width: 150, height: 50 },
  lg: { width: 180, height: 60 },
  xl: { width: 240, height: 80 },
  hero: { width: 500, height: 166 }, // Approximate aspect ratio
};

export function Logo({
  variant = "auto",
  size = "md",
  className,
  priority = false,
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which logo to show
  const getLogoVariant = (): Exclude<LogoVariant, "auto"> => {
    if (variant !== "auto") return variant;

    // Auto mode: use theme to determine black or white
    if (!mounted) return "black"; // Default for SSR

    const currentTheme = resolvedTheme || theme;
    return currentTheme === "dark" ? "white" : "black";
  };

  const logoVariant = getLogoVariant();
  const dimensions = sizeMap[size];

  // Map variant to file name
  const variantMap = {
    black: "BLACK",
    white: "WHITE",
    teal: "TEAL",
    yellow: "YELLOW",
  };

  const logoFileName = variantMap[logoVariant];
  const logoPath = `/logos/SVG/Need_a_Tradesman_Logo_${logoFileName}.svg`;

  // Prevent layout shift during hydration
  if (!mounted && variant === "auto") {
    return (
      <div
        className={cn("inline-block", className)}
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
      />
    );
  }

  return (
    <Image
      src={logoPath}
      alt="Need A Tradesman"
      width={dimensions.width}
      height={dimensions.height}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
