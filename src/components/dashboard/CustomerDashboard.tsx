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
  PlusCircle,
  Briefcase,
  MessageSquare,
  FileText,
  Clock,
  TrendingUp,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  _count: {
    applications: number;
  };
}

interface CustomerDashboardProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
  };
  stats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    unreadMessages: number;
  };
  recentJobs: Job[];
}

export default function CustomerDashboard({
  user,
  stats,
  recentJobs,
}: CustomerDashboardProps) {
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
          Manage your jobs and find the right tradespeople for your projects
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Jobs"
          value={stats.totalJobs.toString()}
          description="All time"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatsCard
          title="Open Jobs"
          value={stats.activeJobs.toString()}
          description="Currently hiring"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatsCard
          title="Applications"
          value={stats.totalApplications.toString()}
          description="Total received"
          icon={<FileText className="h-4 w-4" />}
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
          title="Post a New Job"
          description="Create a new job posting and find qualified tradespeople for your project"
          icon={<PlusCircle className="h-8 w-8" />}
          href="/dashboard/jobs/new"
          buttonText="Post Job"
          variant="primary"
        />

        <ActionCard
          title="My Jobs"
          description="View and manage your posted jobs, review applications, and hire tradespeople"
          icon={<Briefcase className="h-8 w-8" />}
          href="/dashboard/my-jobs"
          buttonText="View Jobs"
        />

        <ActionCard
          title="Browse Tradespeople"
          description="Search and browse profiles of qualified tradespeople in your area"
          icon={<Search className="h-8 w-8" />}
          href="/tradespeople"
          buttonText="Browse Profiles"
        />

        <ActionCard
          title="Messages"
          description="Chat with tradespeople, ask questions, and discuss project details"
          icon={<MessageSquare className="h-8 w-8" />}
          href="/dashboard/messages"
          buttonText="View Messages"
        />

        <ActionCard
          title="Reviews & Ratings"
          description="Leave reviews for completed jobs and manage your feedback"
          icon={<Star className="h-8 w-8" />}
          href="/reviews"
          buttonText="Manage Reviews"
        />

        <ActionCard
          title="Project History"
          description="View completed projects, invoices, and download receipts"
          icon={<TrendingUp className="h-8 w-8" />}
          href="/projects"
          buttonText="View History"
        />
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>
                Your latest job postings and their status
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/my-jobs">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by posting your first job
              </p>
              <Button asChild>
                <Link href="/dashboard/jobs/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <div className="text-primary">{icon}</div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          asChild
          className="w-full"
          variant={variant === "primary" ? "default" : "secondary"}
        >
          <Link href={href}>{buttonText}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function JobCard({ job }: { job: Job }) {
  const statusColors = {
    OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    COMPLETED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="font-medium">{job.title}</h4>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              statusColors[job.status]
            }`}
          >
            {job.status.toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Posted {formatDate(job.createdAt)}</span>
          <span>{job._count.applications} applications</span>
        </div>
      </div>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/my-jobs/${job.id}`}>View</Link>
      </Button>
    </div>
  );
}
