import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;

    // Get the template and verify ownership
    const template = await prisma.quoteTemplate.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!template) {
        return new NextResponse("Template not found", { status: 404 });
    }

    if (template.userId !== user.id) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json(template);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;

    // Get the template and verify ownership
    const template = await prisma.quoteTemplate.findUnique({
        where: { id },
    });

    if (!template) {
        return new NextResponse("Template not found", { status: 404 });
    }

    if (template.userId !== user.id) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    // Delete the template (items will cascade delete due to the relation)
    await prisma.quoteTemplate.delete({
        where: { id },
    });

    return new NextResponse(null, { status: 204 });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;

    // Get the template and verify ownership
    const template = await prisma.quoteTemplate.findUnique({
        where: { id },
    });

    if (!template) {
        return new NextResponse("Template not found", { status: 404 });
    }

    if (template.userId !== user.id) {
        return new NextResponse("Unauthorized", { status: 403 });
    }

    // Update the template
    const body = await request.json();
    const { name, items } = body;

    // Update the template name if provided
    if (name) {
        await prisma.quoteTemplate.update({
            where: { id },
            data: { name },
        });
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
        // Delete existing items
        await prisma.quoteTemplateItem.deleteMany({
            where: { templateId: id },
        });

        // Create new items
        await prisma.quoteTemplate.update({
            where: { id },
            data: {
                items: {
                    create: items.map((item) => ({
                        description: item.description,
                        price: item.unitPrice,
                    })),
                },
            },
        });
    }

    // Return updated template
    const updatedTemplate = await prisma.quoteTemplate.findUnique({
        where: { id },
        include: { items: true },
    });

    return NextResponse.json(updatedTemplate);
}
