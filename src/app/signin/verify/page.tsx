export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A sign in link has been sent to your email address.
          </p>
          <div className="mt-8 rounded-lg border bg-card p-6">
            <p className="text-sm">
              Click the link in the email to sign in. The link will expire in 10 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
