"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PayoutSetupCard } from "@/components/payouts/PayoutSetupCard";
import { PayoutHistory } from "@/components/payouts/PayoutHistory";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createLogger } from '@/lib/logger';

const logger = createLogger('dashboard-payouts');

export default function DashboardPayoutsPage() {
  const searchParams = useSearchParams();
  const onboarded = searchParams.get("onboarded");
  const refresh = searchParams.get("refresh");

  // Feature flag - set NEXT_PUBLIC_PAYOUTS_ENABLED=true to enable payouts feature
  // By default (undefined), payouts are disabled and show "Coming Soon"
  const PAYOUTS_COMING_SOON = process.env.NEXT_PUBLIC_PAYOUTS_ENABLED !== 'true';

  const [status, setStatus] = useState<"not_setup" | "pending" | "verified">(
    "not_setup"
  );
  const [loading, setLoading] = useState(true);

  // Fetch the current status of the tradesperson's Stripe account
  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      try {
        const response = await fetch("/api/stripe/connect/status");
        const data = await response.json();

        if (data.status) {
          setStatus(data.status);
        }
      } catch (error) {
        logger.error({ error }, "Error fetching Stripe account status");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [onboarded, refresh]); // Re-fetch when onboarded or refresh params are present

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen relative">
      <h1 className="text-3xl font-bold mb-6">Payout Settings</h1>

      {/* Coming Soon Overlay - Set NEXT_PUBLIC_PAYOUTS_ENABLED=true to enable */}
      {PAYOUTS_COMING_SOON && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/30">
          <Card className="max-w-md mx-4 shadow-2xl border-2">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <CardTitle className="text-2xl">Coming Soon</CardTitle>
              <CardDescription className="text-base mt-2">
                Payout functionality is currently under development
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                We&apos;re working hard to bring you a seamless payout experience.
              </p>
              <p className="text-sm text-muted-foreground">
                Check back soon for updates!
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Existing content */}
      <div className={PAYOUTS_COMING_SOON ? "opacity-50 pointer-events-none" : ""}>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4">
              <PayoutSetupCard status={status} />
            </div>

            {status === "verified" && (
              <div className="p-4">
                <PayoutHistory />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
