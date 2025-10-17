import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { unstable_cache } from "next/cache";

import { createLogger } from "@/lib/logger";

const logger = createLogger("user-stats-api");

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use unstable_cache for caching with Next.js
        const getUserStats = unstable_cache(
            async (userId: string, role: string) => {
                let stats;

                if (role === UserRole.CUSTOMER) {
                    // Get customer stats
                    const [jobsCount, totalApplications, activeJobs, completedJobs] = await Promise.all([
                        prisma.job.count({
                            where: { customerId: userId }
                        }),
                        prisma.application.count({
                            where: {
                                job: {
                                    customerId: userId
                                }
                            }
                        }),
                        prisma.job.count({
                            where: {
                                customerId: userId,
                                status: { in: ["OPEN", "IN_PROGRESS"] }
                            }
                        }),
                        prisma.job.count({
                            where: {
                                customerId: userId,
                                status: "COMPLETED"
                            }
                        })
                    ]);

                    stats = {
                        role,
                        totalJobs: jobsCount,
                        totalApplications,
                        activeJobs,
                        completedJobs,
                        recentActivity: {
                            recentJobs: await prisma.job.findMany({
                                where: { customerId: userId },
                                include: {
                                    _count: {
                                        select: { applications: true }
                                    }
                                },
                                orderBy: { createdAt: "desc" },
                                take: 3
                            })
                        }
                    };
                } else if (role === UserRole.TRADESPERSON) {
                    // Get tradesperson stats
                    const [applicationsCount, acceptedApplications, pendingApplications, rejectedApplications] = await Promise.all([
                        prisma.application.count({
                            where: { tradespersonId: userId }
                        }),
                        prisma.application.count({
                            where: {
                                tradespersonId: userId,
                                status: "ACCEPTED"
                            }
                        }),
                        prisma.application.count({
                            where: {
                                tradespersonId: userId,
                                status: "PENDING"
                            }
                        }),
                        prisma.application.count({
                            where: {
                                tradespersonId: userId,
                                status: "REJECTED"
                            }
                        })
                    ]);

                    stats = {
                        role,
                        totalApplications: applicationsCount,
                        acceptedApplications,
                        pendingApplications,
                        rejectedApplications,
                        successRate: applicationsCount > 0 ? Math.round((acceptedApplications / applicationsCount) * 100) : 0,
                        recentActivity: {
                            recentApplications: await prisma.application.findMany({
                                where: { tradespersonId: userId },
                                include: {
                                    job: {
                                        select: {
                                            id: true,
                                            title: true,
                                            category: true,
                                            status: true
                                        }
                                    }
                                },
                                orderBy: { createdAt: "desc" },
                                take: 3
                            })
                        }
                    };
                } else {
                    throw new Error("Invalid user role");
                }

                return stats;
            },
            ['user-stats'],
            {
                revalidate: 300, // 5 minutes
                tags: ['user-stats', `user-stats-${user.id}`]
            }
        );

        const stats = await getUserStats(user.id, user.role);

        return NextResponse.json(stats);
    } catch (error) {
        logger.error({ error }, "Error fetching user stats");
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
