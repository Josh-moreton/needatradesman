import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TicketForm } from "@/components/support/TicketForm";
import { Button } from "@/components/ui/button";

export default function NewTicketPage() {
  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/support">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Support Ticket</h1>
          <p className="text-muted-foreground">
            Describe your issue and our support team will assist you
          </p>
        </div>
      </div>

      <TicketForm />
    </div>
  );
}
