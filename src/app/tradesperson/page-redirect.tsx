import { redirect } from "next/navigation";

export default async function TradespersonRedirect() {
  redirect("/dashboard");
}
