/**
 * Common FAQ content for Trade×Location pages
 */

import { JobCategory } from "@prisma/client";
import { FAQItem } from "./seo/schema";

// Generic FAQs that apply to all trades/locations
const GENERIC_FAQS: FAQItem[] = [
  {
    question: "How do I get quotes from local tradespeople?",
    answer:
      "Simply post your job details including what work you need done, your location, and budget. Local verified tradespeople will then send you quotes. You can review their profiles, ratings, and choose the best one for your needs.",
  },
  {
    question: "Are all tradespeople verified?",
    answer:
      "Yes, all tradespeople on Need A Tradesman undergo verification checks. We verify their identity, qualifications, and insurance where applicable. Many also have customer reviews from previous jobs.",
  },
  {
    question: "How does payment work?",
    answer:
      "We use secure payment processing through Stripe. For many jobs, you'll pay a deposit when accepting a quote, with the final payment due upon completion. Your money is protected until you confirm the work is done to your satisfaction.",
  },
  {
    question: "What if I'm not happy with the work?",
    answer:
      "We encourage you to communicate with your tradesperson first. If issues can't be resolved, contact our support team. We hold deposit payments and can help mediate disputes to ensure fair outcomes.",
  },
];

// Trade-specific FAQs
const TRADE_SPECIFIC_FAQS: Record<JobCategory, FAQItem[]> = {
  ELECTRICAL: [
    {
      question: "Do electricians need to be certified?",
      answer:
        "Yes, in the UK all electricians must be registered with a competent person scheme such as NICEIC, NAPIT, ELECSA, or be Part P certified. Always check their credentials before hiring.",
    },
    {
      question: "What qualifications should I look for?",
      answer:
        "Look for Part P certification, NICEIC or NAPIT registration, 18th Edition Wiring Regulations qualification, and appropriate insurance. Many also have City & Guilds or NVQ Level 3 qualifications.",
    },
    {
      question: "Do I need Building Control approval for electrical work?",
      answer:
        "Certain electrical work, particularly in kitchens, bathrooms, and outdoor areas, requires notification to Building Control under Part P regulations. A certified electrician can handle this for you.",
    },
  ],
  PLUMBING: [
    {
      question: "Do plumbers need Gas Safe registration?",
      answer:
        "Any plumber working on gas appliances, boilers, or gas pipework MUST be Gas Safe registered by law. Always verify their Gas Safe number on the official register before hiring.",
    },
    {
      question: "What's the difference between a plumber and a heating engineer?",
      answer:
        "Plumbers handle water systems, pipes, and fixtures. Heating engineers specialize in boilers, radiators, and central heating. Many tradespeople are qualified in both areas.",
    },
    {
      question: "How quickly can a plumber attend an emergency?",
      answer:
        "Many local plumbers offer emergency call-out services, often arriving within 1-2 hours for urgent issues like burst pipes or major leaks. Emergency rates may apply outside normal hours.",
    },
  ],
  CARPENTRY: [
    {
      question: "What's the difference between a carpenter and a joiner?",
      answer:
        "Carpenters typically work on-site with construction and installation (doors, floors, roofing). Joiners work in workshops creating items like cabinets, stairs, and window frames. Many tradespeople do both.",
    },
    {
      question: "Do I need planning permission for carpentry work?",
      answer:
        "Most internal carpentry doesn't need permission, but structural changes, loft conversions, or external alterations might. Your carpenter can advise on whether permissions are needed.",
    },
  ],
  BRICKLAYING: [
    {
      question: "How long does bricklaying work take?",
      answer:
        "This depends on the project size and weather. A typical garden wall might take 2-5 days, while a house extension could take several weeks. Bricklayers typically lay 300-500 bricks per day.",
    },
    {
      question: "Does brickwork need Building Control approval?",
      answer:
        "Major structural work, foundations, and walls over a certain height usually need Building Control approval. Your bricklayer should advise on requirements for your specific project.",
    },
  ],
  PLASTERING: [
    {
      question: "How long does plaster take to dry?",
      answer:
        "Standard plaster typically takes 2-3 days to dry enough for painting, though it can take several weeks to fully cure. Factors like temperature, humidity, and plaster type affect drying time.",
    },
    {
      question: "Should I skim or re-plaster?",
      answer:
        "Skimming (applying a thin finish coat) works for walls in reasonable condition. Re-plastering (full replacement) is needed for severely damaged walls or when removing old plaster. Your plasterer can advise which is best.",
    },
  ],
  PAINTING: [
    {
      question: "How long does paint take to dry?",
      answer:
        "Water-based paints typically dry in 1-2 hours, while oil-based paints take 6-8 hours. However, allow 24 hours between coats and avoid hanging pictures or placing furniture against walls for at least a week.",
    },
    {
      question: "Do I need to prepare walls before painting?",
      answer:
        "Yes, proper preparation is crucial for a quality finish. This includes cleaning walls, filling cracks and holes, sanding rough areas, and applying primer if needed. Professional decorators include this in their service.",
    },
  ],
  LANDSCAPING: [
    {
      question: "Do I need planning permission for landscaping?",
      answer:
        "Most landscaping doesn't need permission, but check if your work involves: significant ground level changes, new buildings/structures over 2.5m high, work near boundaries, or if you're in a conservation area.",
    },
    {
      question: "What's the best time of year for landscaping?",
      answer:
        "Spring (March-May) and autumn (September-November) are ideal for planting. Hard landscaping (patios, decking, walls) can be done year-round in dry weather. Avoid major work during frost or very wet periods.",
    },
  ],
  CLEANING: [
    {
      question: "Are cleaning services insured?",
      answer:
        "Professional cleaners should have public liability insurance to cover any accidental damage. Always verify insurance coverage before hiring, especially for commercial or end-of-tenancy cleaning.",
    },
    {
      question: "Do I need to provide cleaning supplies?",
      answer:
        "Most professional cleaners bring their own equipment and supplies. However, if you have specific preferences or allergies, discuss this in advance. Some services offer eco-friendly or hypoallergenic options.",
    },
  ],
  HANDYMAN: [
    {
      question: "What jobs can a handyman do?",
      answer:
        "Handymen typically handle general repairs, minor plumbing and electrical work, flat-pack assembly, decorating, and odd jobs. For major electrical or gas work, you'll need a certified specialist.",
    },
    {
      question: "Do handymen need to be qualified?",
      answer:
        "While no single handyman qualification exists, good handymen often have experience in multiple trades and relevant insurance. For specialized work (electrical, gas), they must have proper certifications.",
    },
  ],
  OTHER: [
    {
      question: "What if my trade isn't listed?",
      answer:
        "We cover a wide range of trades beyond the main categories. Post your job with details of what you need, and relevant tradespeople can respond with quotes. Most construction and home improvement trades are represented.",
    },
  ],
};

/**
 * Get FAQ items for a specific trade
 * Combines generic FAQs with trade-specific ones
 */
export function getFAQsForTrade(trade: JobCategory): FAQItem[] {
  const tradeSpecific = TRADE_SPECIFIC_FAQS[trade] || [];
  return [...tradeSpecific, ...GENERIC_FAQS];
}

/**
 * Get FAQ items customized for a specific trade×location
 * Replaces generic location references with the actual location
 */
export function getFAQsForTradeLocation(
  trade: JobCategory,
  location: string
): FAQItem[] {
  const baseFAQs = getFAQsForTrade(trade);

  // Customize FAQs by injecting location where relevant (only standalone 'local' words)
  return baseFAQs.map((faq) => ({
    question: faq.question.replace(/\blocal\b/gi, `${location}`),
    answer: faq.answer,
  }));
}
