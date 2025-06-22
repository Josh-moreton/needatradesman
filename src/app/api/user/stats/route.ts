import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { getCachedUserStats, cacheUserStats } from "@/lib/redis";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Try to get stats from cache first
        const cachedStats = await getCachedUserStats(user.id, user.role);
        if (cachedStats) {
            return NextResponse.json(cachedStats);
        }

        let stats;

        if (user.role === UserRole.CUSTOMER) {
            // Get customer stats
            const [jobsCount, totalApplications, activeJobs, completedJobs] = await Promise.all([
                prisma.job.count({
                    where: { customerId: user.id }
                }),
                prisma.application.count({
                    where: {
                        job: {
                            customerId: user.id
                        }
                    }
                }),
                prisma.job.count({
                    where: { 
                        customerId: user.id,
                        status: { in: ["OPEN", "IN_PROGRESS"] }
                    }
                }),
                prisma.job.count({
                    where: { 
                        customerId: user.id,
                        status: "COMPLETED"
                    }
                })
            ]);

            stats = {
                role: user.role,
                totalJobs: jobsCount,
                totalApplications,
                activeJobs,
                completedJobs,
                recentActivity: {
                    recentJobs: await prisma.job.findMany({
                        where: { customerId: user.id },
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
        } else if (user.role === UserRole.TRADESPERSON) {
            // Get tradesperson stats
            const [applicationsCount, acceptedApplications, pendingApplications, rejectedApplications] = await Promise.all([
                prisma.application.count({
                    where: { tradespersonId: user.id }
                }),
                prisma.application.count({
                    where: { 
                        tradespersonId: user.id,
                        status: "ACCEPTED"
                    }
                }),
                prisma.application.count({
                    where: { 
                        tradespersonId: user.id,
                        status: "PENDING"
                    }
                }),
                prisma.application.count({
                    where: { 
                        tradespersonId: user.id,
                        status: "REJECTED"
                    }
                })
            ]);

            stats = {
                role: user.role,
                totalApplications: applicationsCount,
                acceptedApplications,
                pendingApplications,
                rejectedApplications,
                successRate: applicationsCount > 0 ? Math.round((acceptedApplications / applicationsCount) * 100) : 0,
                recentActivity: {
                    recentApplications: await prisma.application.findMany({
                        where: { tradespersonId: user.id },
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
            return NextResponse.json({ error: "Invalid user role" }, { status: 403 });
        }

        // Cache the stats
        await cacheUserStats(user.id, user.role, stats);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching user stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
