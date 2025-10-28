import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Output configuration
  // Note: For Capacitor, we use the default server output mode
  // The mobile app connects to a hosted Next.js server (not static export)
  // This preserves Server Components, API routes, and middleware functionality
  output: process.env.NEXT_OUTPUT_MODE === 'export' ? 'export' : undefined,
  
  // Image optimization - disable for static export if needed
  images: process.env.NEXT_OUTPUT_MODE === 'export' 
    ? { unoptimized: true } 
    : undefined,
};

export default nextConfig;
