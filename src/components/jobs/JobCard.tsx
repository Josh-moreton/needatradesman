import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface JobCardProps {
  readonly job: {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly category: string;
    readonly location: string;
    readonly budget: unknown; // Decimal from Prisma
    readonly status: string;
    readonly createdAt: Date;
    readonly customer?: {
      readonly firstName: string | null;
      readonly lastName: string | null;
    };
    readonly _count?: {
      readonly applications: number;
    };
  };
  readonly variant?: "customer" | "public";
}

export function JobCard({ job, variant = "public" }: JobCardProps) {
  const getStatusColor = (
    status: string
  ): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "OPEN":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      case "COMPLETED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "default";
    }
  };

  const formatBudget = (budget: unknown) => {
    if (!budget) return "Not specified";
    return `£${Number(budget).toFixed(0)}`;
  };

  const getCustomerName = () => {
    if (!job.customer) return "Anonymous";
    const { firstName, lastName } = job.customer;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return "Anonymous";
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <CardDescription className="mt-2">
              {job.description.length > 150
                ? `${job.description.substring(0, 150)}...`
                : job.description}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(job.status)}>
            {job.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="font-medium">Category</p>
            <p className="text-muted-foreground">{job.category}</p>
          </div>
          <div>
            <p className="font-medium">Location</p>
            <p className="text-muted-foreground">{job.location}</p>
          </div>
          <div>
            <p className="font-medium">Budget</p>
            <p className="text-muted-foreground">{formatBudget(job.budget)}</p>
          </div>
          {variant === "public" && job.customer && (
            <div>
              <p className="font-medium">Posted by</p>
              <p className="text-muted-foreground">{getCustomerName()}</p>
            </div>
          )}
          {job._count && (
            <div>
              <p className="font-medium">Responses</p>
              <p className="text-muted-foreground">{job._count.applications}</p>
            </div>
          )}
          <div>
            <p className="font-medium">Posted</p>
            <p className="text-muted-foreground">
              {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {variant === "customer" ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customer/jobs/my-jobs/${job.id}`}>
                  View Details
                </Link>
              </Button>
              {job.status === "OPEN" && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/customer/jobs/my-jobs/${job.id}/edit`}>
                    Edit Job
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tradesperson/jobs/${job.id}`}>View Details</Link>
              </Button>
              {job.status === "OPEN" && (
                <Button size="sm" asChild>
                  <Link href={`/tradesperson/jobs/${job.id}/apply`}>
                    Respond Now
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
