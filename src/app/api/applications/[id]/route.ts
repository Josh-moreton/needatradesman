import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { z } from "zod";
import { redis, invalidateApplicationCaches, invalidateJobDetailCache, invalidateUserStats } from "@/lib/redis";

const updateResponseSchema = z.object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.role !== UserRole.CUSTOMER) {
            return NextResponse.json(
                { error: "Only customers can manage responses" },
                { status: 403 }
            );
        }

        const resolvedParams = await params;
        const body = await request.json();
        const { status } = updateResponseSchema.parse(body);

        // Get the response and verify ownership
        const response = await prisma.application.findUnique({
            where: { id: resolvedParams.id },
            include: {
                job: {
                    select: { customerId: true, status: true },
                },
            },
        });

        if (!response) {
            return NextResponse.json({ error: "Response not found" }, { status: 404 });
        }

        if (response.job.customerId !== user.id) {
            return NextResponse.json(
                { error: "You can only manage responses to your own jobs" },
                { status: 403 }
            );
        }

        if (response.job.status !== "OPEN") {
            return NextResponse.json(
                { error: "Cannot modify responses for closed jobs" },
                { status: 400 }
            );
        }

        if (response.status !== "PENDING") {
            return NextResponse.json(
                { error: "Can only modify pending responses" },
                { status: 400 }
            );
        }

        // Update the response status
        const updatedResponse = await prisma.application.update({
            where: { id: resolvedParams.id },
            data: { status },
            include: {
                tradesperson: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        // If accepted, update job status and reject other pending responses
        if (status === "ACCEPTED") {
            await prisma.$transaction([
                // Update job status
                prisma.job.update({
                    where: { id: response.jobId },
                    data: { status: "IN_PROGRESS" },
                }),
                // Reject other pending responses
                prisma.application.updateMany({
                    where: {
                        jobId: response.jobId,
                        id: { not: resolvedParams.id },
                        status: "PENDING",
                    },
                    data: { status: "REJECTED" },
                }),
            ]);
        }

        // Invalidate relevant caches after application status update
        if (redis) {
            try {
                await Promise.all([
                    // Invalidate application caches for both customer and tradesperson
                    invalidateApplicationCaches(user.id, UserRole.CUSTOMER),
                    invalidateApplicationCaches(updatedResponse.tradesperson.id, UserRole.TRADESPERSON),
                    // Invalidate job detail cache as application status changed
                    invalidateJobDetailCache(response.jobId),
                    // Invalidate user stats for both users
                    invalidateUserStats(user.id, UserRole.CUSTOMER),
                    invalidateUserStats(updatedResponse.tradesperson.id, UserRole.TRADESPERSON)
                ]);
                console.log('Invalidated caches after application status update');
            } catch (cacheError) {
                console.error('Cache invalidation error:', cacheError);
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json({ response: updatedResponse });
    } catch (error) {
        console.error("Error updating response:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid input", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to update response" },
            { status: 500 }
        );
    }
}
