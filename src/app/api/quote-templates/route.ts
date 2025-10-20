import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { quoteItemSchema } from "@/lib/schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const templates = await prisma.quoteTemplate.findMany({
    where: { userId: user.id },
    include: { items: true },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const body = await request.json();
  const { name, items } = body as { name: string; items: unknown };
  if (!name || !Array.isArray(items)) {
    return new NextResponse("Invalid data", { status: 400 });
  }

  const parsedItems = items.map((i) => quoteItemSchema.parse(i));

  const template = await prisma.quoteTemplate.create({
    data: {
      name,
      userId: user.id,
      items: {
        create: parsedItems.map((i) => ({
          description: i.description,
          price: i.unitPrice,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(template, { status: 201 });
}
