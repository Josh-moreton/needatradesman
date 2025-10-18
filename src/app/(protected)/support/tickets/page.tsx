import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/support/TicketCard";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TicketsListPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect("/onboarding");
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      createdById: user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      lastUpdatedAt: 'desc',
    },
  });

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/support">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">My Support Tickets</h1>
          <p className="text-muted-foreground">
            View and manage your support requests
          </p>
        </div>
        <Link href="/support/new">
          <Button>Create New Ticket</Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">You haven&apos;t created any support tickets yet.</p>
          <Link href="/support/new">
            <Button>Create Your First Ticket</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
