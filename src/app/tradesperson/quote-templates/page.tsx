import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteTemplatesClient from "@/components/quotes/QuoteTemplatesClient";

export default async function QuoteTemplatesPage() {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== "TRADESPERSON") {
    redirect("/");
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Manage Quote Templates</h1>
      <QuoteTemplatesClient userId={user.id} />
    </div>
  );
}
