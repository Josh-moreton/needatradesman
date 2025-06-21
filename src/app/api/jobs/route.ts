import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema } from "@/lib/schemas";
import { UserRole, JobCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get user from database and verify role
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (user.role !== UserRole.CUSTOMER) {
            return new NextResponse("Only customers can create jobs", { status: 403 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = createJobSchema.parse(body);

        // Create job in database
        const job = await prisma.job.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category,
                location: validatedData.location,
                budget: validatedData.budget,
                attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
                customerId: user.id,
                status: "OPEN",
            },
        });

        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        console.error("Error creating job:", error);

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get all open jobs for public viewing (tradespeople)
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const location = searchParams.get("location");

        const where = {
            status: "OPEN" as const,
            ...(category && { category: category as JobCategory }),
            ...(location && {
                location: {
                    contains: location,
                    mode: "insensitive" as const,
                }
            }),
        };

        const jobs = await prisma.job.findMany({
            where,
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(jobs);
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
