import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Support Center</h1>
        <p className="text-muted-foreground">
          Get help with your account, jobs, or any issues you&apos;re experiencing
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
            <CardDescription>
              Submit a support request and our team will get back to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/support/new">
              <Button className="w-full">Create Ticket</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>View My Tickets</CardTitle>
            <CardDescription>
              Check the status of your existing support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/support/tickets">
              <Button variant="outline" className="w-full">View Tickets</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">How long does it take to get a response?</h3>
            <p className="text-sm text-muted-foreground">
              Our support team typically responds within 24 hours. For urgent issues,
              please mark your ticket as &quot;Urgent&quot; when creating it.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">What information should I include?</h3>
            <p className="text-sm text-muted-foreground">
              Please provide as much detail as possible, including any error messages,
              screenshots, and steps to reproduce the issue.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Can I update my ticket after submission?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can add messages to your ticket at any time by viewing the ticket
              and using the reply form.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
