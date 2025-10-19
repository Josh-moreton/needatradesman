"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowDownRight, Calendar, Banknote } from "lucide-react";
import { createLogger } from "@/lib/logger";

const logger = createLogger("payout-history");

interface Payout {
  id: string;
  amount: number;
  currency: string;
  created: number;
  description: string | null;
  status: string;
  job: {
    id: string;
    title: string;
    paymentType: "deposit" | "final";
  } | null;
}

export function PayoutHistory() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayouts() {
      try {
        const response = await fetch("/api/stripe/payouts");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch payouts");
        }

        setPayouts(data.payouts || []);
      } catch (err) {
        logger.error({ error: err }, "Error fetching payouts");
        setError(err instanceof Error ? err.message : "Failed to load payouts");
      } finally {
        setLoading(false);
      }
    }

    fetchPayouts();
  }, []);

  const formatAmount = (amount: number, currency: string) => {
    // Stripe amounts are in cents/pence
    const value = amount / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp * 1000));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your recent payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your recent payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout History</CardTitle>
        <CardDescription>
          {payouts.length > 0
            ? "Your recent payouts from completed jobs"
            : "View your recent payouts"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Your payouts will appear here once you start receiving payments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    <ArrowDownRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {payout.job ? (
                      <>
                        <p className="font-medium truncate">{payout.job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {payout.job.paymentType === "deposit"
                            ? "Deposit Payment"
                            : "Final Payment"}
                        </p>
                      </>
                    ) : (
                      <p className="font-medium">
                        {payout.description || "Payment"}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payout.created)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="font-semibold text-green-600">
                    {formatAmount(payout.amount, payout.currency)}
                  </p>
                  <Badge
                    variant={payout.status === "paid" ? "default" : "secondary"}
                  >
                    {payout.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
