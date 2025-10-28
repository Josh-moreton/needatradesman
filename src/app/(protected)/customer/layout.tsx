/**
 * Customer Layout
 * 
 * This layout wraps customer-specific routes.
 * Props are marked as read-only to satisfy TypeScript best practices.
 */

export default async function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
