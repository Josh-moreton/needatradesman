"use client";

import { UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Briefcase,
  MessageSquare,
  Search,
  FileText,
  Mail,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DashboardProps {
  user: {
    role: UserRole;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export default function Dashboard({ user }: DashboardProps) {
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "there";

  if (user.role === UserRole.CUSTOMER) {
    return <CustomerDashboard displayName={displayName} />;
  } else if (user.role === UserRole.TRADESPERSON) {
    return <TradespersonDashboard displayName={displayName} />;
  }

  return null;
}

function CustomerDashboard({ displayName }: { displayName: string }) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Manage your job postings and connect with skilled tradespeople
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Jobs"
          value="3"
          description="+2 from last month"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatsCard
          title="Applications"
          value="12"
          description="+4 new today"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatsCard
          title="Messages"
          value="8"
          description="2 unread"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatsCard
          title="Completed Jobs"
          value="7"
          description="This year"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Post a New Job"
          description="Tell us about the work you need done and get quotes from qualified tradespeople"
          icon={<PlusCircle className="h-8 w-8" />}
          href="/jobs/new"
          buttonText="Create Job"
          variant="primary"
        />

        <ActionCard
          title="My Job Posts"
          description="View and manage your active job listings, edit details, and review applications"
          icon={<Briefcase className="h-8 w-8" />}
          href="/jobs/my-jobs"
          buttonText="View Jobs"
        />

        <ActionCard
          title="Applications"
          description="Review applications from tradespeople and choose the right person for your job"
          icon={<FileText className="h-8 w-8" />}
          href="/applications"
          buttonText="View Applications"
        />

        <ActionCard
          title="Messages"
          description="Communicate with tradespeople about your projects and get clarifications"
          icon={<MessageSquare className="h-8 w-8" />}
          href="/messages"
          buttonText="View Messages"
        />

        <ActionCard
          title="Browse Tradespeople"
          description="Search for specific tradespeople in your area and view their profiles"
          icon={<Search className="h-8 w-8" />}
          href="/tradespeople"
          buttonText="Browse"
        />

        <ActionCard
          title="Payment History"
          description="View your payment history, invoices, and manage billing information"
          icon={<Clock className="h-8 w-8" />}
          href="/payments"
          buttonText="View Payments"
        />
      </div>
    </div>
  );
}

function TradespersonDashboard({ displayName }: { displayName: string }) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Find new opportunities and manage your applications
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Applications"
          value="5"
          description="+2 this week"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatsCard
          title="New Jobs"
          value="23"
          description="In your categories"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatsCard
          title="Messages"
          value="6"
          description="3 unread"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatsCard
          title="Jobs Won"
          value="4"
          description="This month"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Find Jobs"
          description="Browse available job opportunities in your area and apply to jobs that match your skills"
          icon={<Search className="h-8 w-8" />}
          href="/jobs"
          buttonText="Browse Jobs"
          variant="primary"
        />

        <ActionCard
          title="My Applications"
          description="Track your job applications, view responses, and manage your application status"
          icon={<FileText className="h-8 w-8" />}
          href="/applications/my-applications"
          buttonText="View Applications"
        />

        <ActionCard
          title="Messages"
          description="Chat with potential customers, ask questions, and negotiate project details"
          icon={<MessageSquare className="h-8 w-8" />}
          href="/messages"
          buttonText="View Messages"
        />

        <ActionCard
          title="My Profile"
          description="Update your profile, add skills, upload portfolio images, and manage your reputation"
          icon={<TrendingUp className="h-8 w-8" />}
          href="/profile"
          buttonText="Edit Profile"
        />

        <ActionCard
          title="Earnings"
          description="View your earnings, payment history, and manage your payout preferences"
          icon={<Clock className="h-8 w-8" />}
          href="/earnings"
          buttonText="View Earnings"
        />

        <ActionCard
          title="Reviews"
          description="See customer reviews and feedback to build your reputation on the platform"
          icon={<Mail className="h-8 w-8" />}
          href="/reviews"
          buttonText="View Reviews"
        />
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon,
  href,
  buttonText,
  variant = "default",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
  variant?: "default" | "primary";
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-muted rounded-lg">{icon}</div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button
            className="w-full"
            variant={variant === "primary" ? "default" : "outline"}
          >
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
