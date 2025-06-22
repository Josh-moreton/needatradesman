import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-2">
          Your messages will appear here.
        </p>
      </div>
    </DashboardLayout>
  );
}
