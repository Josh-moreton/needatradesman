"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PayoutSetupCard } from "@/components/payouts/PayoutSetupCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PayoutsPage() {
  const searchParams = useSearchParams();
  const onboarded = searchParams.get("onboarded");
  const refresh = searchParams.get("refresh");

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
        console.error("Error fetching Stripe account status:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [onboarded, refresh]); // Re-fetch when onboarded or refresh params are present

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Payout Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PayoutSetupCard status={status} />

          {status === "verified" && (
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>View your recent payouts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your payouts will appear here once you start receiving
                  payments.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
