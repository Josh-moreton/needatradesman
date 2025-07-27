"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  FileText,
  MessageSquare,
  Search,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
} from "lucide-react";
import Link from "next/link";

interface TradespersonStats {
  totalApplications: number;
  availableJobs: number;
  jobsWon: number;
  unreadMessages: number;
}

interface TradespersonDashboardProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
  };
  stats: TradespersonStats;
}

export default function TradespersonDashboard({
  user,
  stats,
}: TradespersonDashboardProps) {
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "there";

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Find new opportunities and manage your business
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Applications Sent"
          value={stats.totalApplications.toString()}
          description="Total submitted"
          icon={<FileText className="h-4 w-4" />}
        />
        <StatsCard
          title="Available Jobs"
          value={stats.availableJobs.toString()}
          description="In your trades"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatsCard
          title="Jobs Won"
          value={stats.jobsWon.toString()}
          description="Accepted applications"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          title="Messages"
          value={stats.unreadMessages.toString()}
          description="Unread"
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Find Jobs"
          description="Browse available job opportunities in your area and apply to jobs that match your skills"
          icon={<Search className="h-8 w-8" />}
          href="/dashboard/jobs"
          buttonText="Browse Jobs"
          variant="primary"
        />

        <ActionCard
          title="My Applications"
          description="Track your job applications, view responses, and manage your application status"
          icon={<FileText className="h-8 w-8" />}
          href="/dashboard/my-responses"
          buttonText="View Applications"
        />

        <ActionCard
          title="Messages"
          description="Chat with potential customers, ask questions, and negotiate project details"
          icon={<MessageSquare className="h-8 w-8" />}
          href="/dashboard/messages"
          buttonText="View Messages"
        />

        <ActionCard
          title="Quote Templates"
          description="Create and manage reusable quote templates to speed up your application process"
          icon={<Clock className="h-8 w-8" />}
          href="/dashboard/quote-templates"
          buttonText="Manage Templates"
        />

        <ActionCard
          title="Payouts"
          description="Set up your payout method and view your earnings and payment history"
          icon={<DollarSign className="h-8 w-8" />}
          href="/dashboard/payouts"
          buttonText="Setup Payouts"
        />

        <ActionCard
          title="Profile & Reviews"
          description="Update your profile, showcase your work, and manage your professional reputation"
          icon={<Star className="h-8 w-8" />}
          href="/dashboard/profile"
          buttonText="Edit Profile"
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
