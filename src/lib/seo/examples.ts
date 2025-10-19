/**
 * Example implementations for JSON-LD structured data
 * These are reference examples showing how to use the schema builders in different contexts
 * Copy and adapt these patterns when implementing structured data on actual pages
 */

/**
 * EXAMPLE 1: Trade-Location Service Page
 * Use this pattern for pages like "/services/plumbing/london"
 * 
 * Implementation:
 * 1. Import the necessary modules
 * 2. Build the schema with your page data
 * 3. Render the JsonLd component with the schema
 */
export const ServicePageExample = `
  // In a server component (e.g., src/app/services/[trade]/[location]/page.tsx)
  import { JsonLd } from '@/components/seo/JsonLd';
  import { serviceSchema } from '@/lib/seo/schema';
  import { JobCategory } from '@prisma/client';
  
  export default function ServicePage({ 
    params 
  }: { 
    params: { trade: string; location: string } 
  }) {
    const schema = serviceSchema({
      trade: JobCategory.PLUMBING,
      location: "London",
      priceRange: "£50-£200",
      priceUnit: "GBP",
      areaServed: ["London", "Westminster", "Camden", "Islington"],
      availability: "https://schema.org/InStock",
      url: "https://needatradesman.com/services/plumbing/london"
    });

    return (
      <>
        <JsonLd data={schema} />
        {/* Page content */}
      </>
    );
  }
`;

/**
 * EXAMPLE 2: Tradesperson/Provider Profile Page
 * Use this pattern for individual tradesperson profile pages
 * IMPORTANT: Only include reviews about the third-party business, NOT self-serving reviews
 */
export const ProviderProfileExample = `
  // In a server component for /providers/[id]
  import { JsonLd } from '@/components/seo/JsonLd';
  import { providerSchema } from '@/lib/seo/schema';
  import { prisma } from '@/lib/prisma';

  // Fetch provider data from database
  async function getProviderData(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        // Include any reviews/ratings stored in your system
        // Only if they are about THIS provider's business
      }
    });
    return user;
  }

  export default async function ProviderPage({ params }: { params: { id: string } }) {
    const provider = await getProviderData(params.id);
    
    if (!provider) {
      return notFound();
    }

    // Build schema from provider data
    const schema = providerSchema({
      name: \`\${provider.firstName} \${provider.lastName}\`,
      url: \`https://needatradesman.com/providers/\${provider.id}\`,
      // Add address if available in your User model
      // address: {
      //   streetAddress: provider.address?.street,
      //   addressLocality: provider.address?.city,
      //   postalCode: provider.address?.postcode,
      //   addressCountry: "GB"
      // },
      // Add contact info if public
      // telephone: provider.publicPhone,
      // email: provider.publicEmail,
      // Add service areas based on provider's preferences
      areaServed: ["London", "Greater London"],
      priceRange: "££",
      // IMPORTANT: Only add reviews if they are legitimate third-party reviews
      // about THIS provider's business, not reviews of the marketplace
      // reviews: provider.reviews?.map(review => ({
      //   "@type": "Review",
      //   author: {
      //     "@type": "Person",
      //     name: review.authorName
      //   },
      //   reviewRating: {
      //     "@type": "Rating",
      //     ratingValue: review.rating,
      //     bestRating: 5
      //   },
      //   reviewBody: review.text,
      //   datePublished: review.createdAt.toISOString()
      // })),
      // aggregateRating: provider.reviewCount > 0 ? {
      //   ratingValue: provider.averageRating,
      //   reviewCount: provider.reviewCount
      // } : undefined
    });

    return (
      <>
        <JsonLd data={schema} />
        {/* Provider profile content */}
      </>
    );
  }
`;

/**
 * EXAMPLE 3: FAQ/Help Page
 * Use this pattern for help center pages with Q&A
 */
export const FAQPageExample = `
  import { JsonLd } from '@/components/seo/JsonLd';
  import { faqSchema } from '@/lib/seo/schema';

  const faqs = [
    {
      question: "How do I post a job?",
      answer: "Click the 'Post a Job' button, fill in the details about your project including title, description, location, and budget. Our verified tradespeople will then submit quotes."
    },
    {
      question: "Are tradespeople verified?",
      answer: "Yes, all tradespeople on Need A Tradesman go through our verification process including identity checks and qualification verification."
    },
    {
      question: "How does payment work?",
      answer: "We use secure Stripe payments. You can pay a deposit when accepting a quote, and release the final payment once the work is complete."
    },
    {
      question: "What if I'm not satisfied with the work?",
      answer: "We have a dispute resolution process. Contact our support team and we'll work to resolve any issues fairly."
    }
  ];

  const schema = faqSchema(faqs);

  return (
    <>
      <JsonLd data={schema} />
      <div className="faq-content">
        {faqs.map((faq, i) => (
          <div key={i}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </div>
    </>
  );
`;

/**
 * EXAMPLE 4: How-To Guide Page
 * Use this pattern for tutorial/guide pages
 */
export const HowToGuideExample = `
  import { JsonLd } from '@/components/seo/JsonLd';
  import { howToSchema } from '@/lib/seo/schema';

  const schema = howToSchema({
    name: "How to Hire a Tradesperson on Need A Tradesman",
    description: "A complete guide to posting a job and hiring a qualified tradesperson through our platform",
    totalTime: "PT10M", // ISO 8601 duration format: 10 minutes
    estimatedCost: {
      currency: "GBP",
      value: "0" // Free to post
    },
    image: "https://needatradesman.com/guides/hiring-guide.jpg",
    steps: [
      {
        name: "Create your free account",
        text: "Sign up on Need A Tradesman. It only takes a minute and you can start posting jobs immediately.",
        image: "https://needatradesman.com/guides/step-1.jpg"
      },
      {
        name: "Post your job",
        text: "Describe your project, set your budget, and add any photos. The more detail you provide, the better quotes you'll receive.",
        image: "https://needatradesman.com/guides/step-2.jpg"
      },
      {
        name: "Review quotes",
        text: "Verified tradespeople will submit their quotes. Review their profiles, ratings, and previous work.",
        image: "https://needatradesman.com/guides/step-3.jpg"
      },
      {
        name: "Accept and pay deposit",
        text: "Choose the best tradesperson for your job and pay a secure deposit through our platform.",
        image: "https://needatradesman.com/guides/step-4.jpg"
      },
      {
        name: "Get the work done",
        text: "The tradesperson completes your job. Stay in touch through our messaging system.",
        image: "https://needatradesman.com/guides/step-5.jpg"
      },
      {
        name: "Release final payment",
        text: "Once you're happy with the work, release the final payment. Leave a review to help other customers.",
        image: "https://needatradesman.com/guides/step-6.jpg"
      }
    ]
  });

  return (
    <>
      <JsonLd data={schema} />
      {/* Guide content */}
    </>
  );
`;

/**
 * EXAMPLE 5: Trade Category Landing Page
 * Use this pattern for pages like "/services/plumbing"
 */
export const TradeCategoryPageExample = `
  import { JsonLd } from '@/components/seo/JsonLd';
  import { serviceSchema } from '@/lib/seo/schema';
  import { JobCategory } from '@prisma/client';

  // For a page at /services/plumbing
  const schema = serviceSchema({
    trade: JobCategory.PLUMBING,
    priceRange: "£50-£500",
    priceUnit: "GBP",
    areaServed: [
      "London", 
      "Birmingham", 
      "Manchester", 
      "Leeds", 
      "Liverpool",
      "Bristol"
      // List major cities you serve
    ],
    availability: "https://schema.org/InStock",
    url: "https://needatradesman.com/services/plumbing"
  });

  return (
    <>
      <JsonLd data={schema} />
      <h1>Plumbing Services</h1>
      {/* List of available plumbers, locations, etc. */}
    </>
  );
`;

/**
 * EXAMPLE 6: Multiple Schemas on One Page
 * Use combineSchemas when you need multiple schema types on the same page
 */
export const MultipleSchemaExample = `
  import { JsonLd } from '@/components/seo/JsonLd';
  import { combineSchemas, serviceSchema, faqSchema } from '@/lib/seo/schema';
  import { JobCategory } from '@prisma/client';

  // Service page with FAQ section
  const service = serviceSchema({
    trade: JobCategory.ELECTRICAL,
    location: "Manchester",
    priceRange: "£60-£150",
    areaServed: ["Manchester", "Salford", "Stockport"]
  });

  const faqs = faqSchema([
    {
      question: "Do electricians need to be certified?",
      answer: "Yes, all our electricians are fully qualified and certified to work on electrical systems."
    },
    {
      question: "Is emergency electrical service available?",
      answer: "Yes, many of our electricians offer 24/7 emergency services for urgent electrical issues."
    }
  ]);

  const combined = combineSchemas([service, faqs]);

  return (
    <>
      <JsonLd data={combined} />
      {/* Page content with service info and FAQ section */}
    </>
  );
`;
