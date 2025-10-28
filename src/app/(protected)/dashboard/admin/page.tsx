import { requireRole } from "@/lib/auth-gate"
import { UserRole } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Briefcase, Users, Shield } from "lucide-react"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  try {
    // Require admin role - will throw if user is not admin
    await requireRole(UserRole.ADMIN)
  } catch {
    // Redirect non-admin users
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Manage and monitor the platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Jobs Management</CardTitle>
            </div>
            <CardDescription>
              View all jobs in the system, monitor their status, and access messages between customers and tradespeople
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/admin/jobs">
                <Briefcase className="h-4 w-4 mr-2" />
                View All Jobs
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">User Management</CardTitle>
            </div>
            <CardDescription>
              View all users from Clerk and local database, check sync status, and identify data inconsistencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/admin/users">
                <Users className="h-4 w-4 mr-2" />
                View All Users
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
