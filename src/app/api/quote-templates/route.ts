import { NextRequest, NextResponse } from "next/server";
import { requireAuthGate } from "@/lib/auth-gate";
import { prisma } from "@/lib/prisma";
import { quoteItemSchema } from "@/lib/schemas";

export async function GET() {
  const gate = await requireAuthGate();

  const templates = await prisma.quoteTemplate.findMany({
    where: { userId: gate.userId },
    include: { items: true },
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const gate = await requireAuthGate();

  const body = await request.json();
  const { name, items } = body as { name: string; items: unknown };
  if (!name || !Array.isArray(items)) {
    return new NextResponse("Invalid data", { status: 400 });
  }

  const parsedItems = items.map((i) => quoteItemSchema.parse(i));

  const template = await prisma.quoteTemplate.create({
    data: {
      name,
      userId: gate.userId,
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
