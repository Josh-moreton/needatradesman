import { getAuthGate } from "@/lib/auth-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function DashboardErrorPage() {
  const gate = await getAuthGate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Error</CardTitle>
            <CardDescription>
              There was a problem accessing your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!gate ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Please sign in to access your dashboard
                </p>
                <Button asChild className="w-full">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </>
            ) : !gate.role ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Complete your account setup to continue
                </p>
                <Button asChild className="w-full">
                  <Link href="/dashboard">Complete Setup</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Your account role is not recognized. Please contact support.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Reset Account</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
