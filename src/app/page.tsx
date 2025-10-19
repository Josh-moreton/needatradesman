import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import LandingPage from "@/components/landing/LandingPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { orgSchema, websiteSchema, combineSchemas } from "@/lib/seo/schema";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();

  // If not signed in, show the marketing/landing page
  if (!userId) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://needatradesman.com";

    const organizationSchema = orgSchema({
      name: "Need A Tradesman",
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      sameAs: [
        // Add social media profiles when available
        // "https://www.facebook.com/needatradesman",
        // "https://twitter.com/needatradesman",
      ],
    });

    const websiteSchemaData = websiteSchema({
      name: "Need A Tradesman",
      url: baseUrl,
      searchAction: {
        target: `${baseUrl}/search?q={search_term_string}`,
        queryInput: "required name=search_term_string",
      },
    });

    const combinedSchema = combineSchemas([
      organizationSchema,
      websiteSchemaData,
    ]);

    return (
      <>
        <JsonLd data={combinedSchema} />
        <LandingPage />
      </>
    );
  }

  // If signed in, always route to dashboard; onboarding gating happens there
  redirect("/dashboard");
}
