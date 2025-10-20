"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Book } from "lucide-react";
import { Crisp } from "crisp-sdk-web";

export default function SupportPage() {
  const openChat = () => {
    Crisp.chat.open();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl bg-background min-h-screen">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Support Center
        </h1>
        <p className="text-muted-foreground text-lg">
          We&apos;re here to help! Get in touch with our support team through live chat.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Live Chat Support</CardTitle>
            </div>
            <CardDescription>
              Get instant help from our support team via live chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openChat} className="w-full">
              Start Chat
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Available Monday-Friday, 9am-5pm GMT
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Support</CardTitle>
            </div>
            <CardDescription>
              Send us an email and we&apos;ll get back to you within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@needatradesman.co.uk">
                Email Us
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <CardTitle>Frequently Asked Questions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">How do I post a job?</h3>
            <p className="text-sm text-muted-foreground">
              Navigate to the dashboard and click &quot;Post a Job&quot;. Fill in the job details including title, description, category, location, and budget. Once submitted, tradespeople can view and apply for your job.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">How do I apply for jobs?</h3>
            <p className="text-sm text-muted-foreground">
              As a tradesperson, browse available jobs from your dashboard. Click on a job to view details, then submit an application with your quote and message explaining why you&apos;re the right fit.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">How do payments work?</h3>
            <p className="text-sm text-muted-foreground">
              When you accept a tradesperson&apos;s application, you&apos;ll be prompted to pay a deposit (percentage set by the tradesperson, commonly 25-50%). Once the job is completed and both parties confirm, the remaining payment is processed and released to the tradesperson.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">What if I need help with something else?</h3>
            <p className="text-sm text-muted-foreground">
              Click the chat button in the bottom right corner of any page to start a live chat with our support team, or use the &quot;Start Chat&quot; button above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
