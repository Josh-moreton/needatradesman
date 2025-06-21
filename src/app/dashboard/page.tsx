import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === UserRole.CUSTOMER) {
    return <CustomerDashboard user={user} />;
  } else if (user.role === UserRole.TRADESPERSON) {
    return <TradespersonDashboard user={user} />;
  }

  redirect("/onboarding");
}

function CustomerDashboard({
  user,
}: {
  user: { role: UserRole; firstName?: string | null };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{user.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-gray-600">
          Manage your job postings and find the right tradesperson
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Post a New Job"
          description="Tell us about the work you need done"
          icon="✍️"
          href="/jobs/new"
          buttonText="Create Job"
        />

        <DashboardCard
          title="My Job Posts"
          description="View and manage your active job listings"
          icon="📋"
          href="/jobs/my-jobs"
          buttonText="View Jobs"
        />

        <DashboardCard
          title="Applications"
          description="Review applications from tradespeople"
          icon="📬"
          href="/applications"
          buttonText="View Applications"
        />
      </div>
    </div>
  );
}

function TradespersonDashboard({
  user,
}: {
  user: { role: UserRole; firstName?: string | null };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{user.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="text-gray-600">
          Find new opportunities and manage your applications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Find Jobs"
          description="Browse available job opportunities"
          icon="🔍"
          href="/jobs"
          buttonText="Browse Jobs"
        />

        <DashboardCard
          title="My Applications"
          description="Track your job applications and responses"
          icon="📝"
          href="/applications/my-applications"
          buttonText="View Applications"
        />

        <DashboardCard
          title="Messages"
          description="Chat with potential customers"
          icon="💬"
          href="/messages"
          buttonText="View Messages"
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  buttonText: string;
}

function DashboardCard({
  title,
  description,
  icon,
  href,
  buttonText,
}: DashboardCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <a
        href={href}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        {buttonText}
      </a>
    </div>
  );
}
