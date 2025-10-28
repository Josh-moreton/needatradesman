"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { UserRole } from "@prisma/client"

type UserData = {
  clerkId: string
  clerkData: {
    id: string
    email?: string
    firstName: string | null
    lastName: string | null
    createdAt: number
    lastSignInAt: number | null
  } | null
  dbData: {
    id: string
    clerkId: string
    email: string
    firstName: string | null
    lastName: string | null
    role: UserRole
    trades: string[]
    stripeAccountId: string | null
    createdAt: Date
    updatedAt: Date
  } | null
  synced: boolean
  syncIssues: string[]
}

type UsersResponse = {
  users: UserData[]
  total: number
  synced: number
  unsynced: number
}

export default function AdminUsersPage() {
  const [usersData, setUsersData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/admin/users")
        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }
        const data = await response.json()
        setUsersData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "CUSTOMER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "TRADESPERSON":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading users...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!usersData) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin - All Users</h1>
        <p className="text-muted-foreground mt-2">
          View all users from Clerk and local database with sync status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">
              Synced Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {usersData.synced}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">
              Unsynced Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {usersData.unsynced}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>Clerk ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role (DB)</TableHead>
                  <TableHead>In Clerk</TableHead>
                  <TableHead>In DB</TableHead>
                  <TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  usersData.users.map((user) => (
                    <TableRow key={user.clerkId}>
                      <TableCell>
                        {user.synced ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs">Synced</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Not Synced</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.clerkId.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.clerkData?.email || user.dbData?.email || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(user.clerkData?.firstName || user.dbData?.firstName || "N/A")}{" "}
                        {user.clerkData?.lastName || user.dbData?.lastName || ""}
                      </TableCell>
                      <TableCell>
                        {user.dbData?.role ? (
                          <Badge className={getRoleBadgeColor(user.dbData.role)}>
                            {user.dbData.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.clerkData ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.dbData ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.syncIssues.length > 0 ? (
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                              {user.syncIssues.map((issue, idx) => (
                                <div key={idx} className="text-yellow-700 dark:text-yellow-300">
                                  {issue}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No issues</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
