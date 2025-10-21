"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    BookOpen, 
    GraduationCap, 
    CreditCard, 
    CheckCircle2, 
    AlertCircle,
    ExternalLink,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface CapitalOffer {
    hasAccount: boolean;
    onboarded: boolean;
    eligible: boolean;
    capitalEnabled: boolean;
    dashboardUrl?: string;
    summary?: {
        available_amount?: number;
        currency?: string;
    };
}

interface Course {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    level: string;
    certification: string;
}

// Sample courses for the Academy
const COURSES: Course[] = [
    {
        id: "gas-safe",
        title: "Gas Safe Registration Training",
        description: "Complete training and certification to become Gas Safe registered. Essential for any gas engineer working in the UK.",
        price: 1500,
        duration: "5 days",
        level: "Intermediate",
        certification: "Gas Safe Certificate",
    },
    {
        id: "electrical-part-p",
        title: "Electrical Part P Certification",
        description: "Building Regulations compliance certification for electrical installations in domestic properties.",
        price: 1200,
        duration: "3 days",
        level: "Intermediate",
        certification: "Part P Certificate",
    },
    {
        id: "cscs-card",
        title: "CSCS Card Training & Test",
        description: "Construction Skills Certification Scheme card training and testing. Required for most construction sites.",
        price: 250,
        duration: "1 day",
        level: "Beginner",
        certification: "CSCS Card",
    },
    {
        id: "nvq-plumbing",
        title: "NVQ Level 2 Plumbing",
        description: "Nationally recognized qualification in plumbing. Perfect for those starting their plumbing career.",
        price: 3500,
        duration: "12 months",
        level: "Beginner to Intermediate",
        certification: "NVQ Level 2",
    },
    {
        id: "first-aid",
        title: "First Aid at Work",
        description: "Essential first aid training for tradespeople. Learn to handle emergencies on site.",
        price: 150,
        duration: "1 day",
        level: "All levels",
        certification: "First Aid Certificate",
    },
    {
        id: "advanced-carpentry",
        title: "Advanced Carpentry & Joinery",
        description: "Enhance your carpentry skills with advanced techniques and modern methods.",
        price: 2000,
        duration: "6 weeks",
        level: "Advanced",
        certification: "City & Guilds Advanced",
    },
];

export default function AcademyPage() {
    const [capitalOffer, setCapitalOffer] = useState<CapitalOffer | null>(null);
    const [isTradesperson, setIsTradesperson] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCapitalOffers();
    }, []);

    const fetchCapitalOffers = async () => {
        try {
            const response = await fetch("/api/stripe/capital/offers");
            const data = await response.json();

            if (response.status === 403) {
                // Not a tradesperson; hide Capital-related UI
                setIsTradesperson(false);
                setCapitalOffer(null);
            } else {
                // From this point forward we treat the user as a tradesperson
                setIsTradesperson(true);

                if (response.status === 400) {
                    // Tradesperson but missing Stripe setup or similar
                    setCapitalOffer(null);
                } else if (response.ok) {
                    setCapitalOffer(data);
                } else {
                    // Unknown status - don't show offers
                    setCapitalOffer(null);
                }
            }
        } catch {
            // Silently handle errors - Capital offers are optional
            if (process.env.NODE_ENV === "development") {
                console.error("Error fetching capital offers");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
        }).format(amount);
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-10 w-10" />
                    NeedaTradesman Academy
                </h1>
                <p className="text-muted-foreground text-lg">
                    Professional training and certifications to advance your career
                </p>
            </div>

            {/* Stripe Capital Financing Card */}
            {!loading && capitalOffer?.eligible && capitalOffer?.capitalEnabled && (
                <Card className="mb-8 border-primary bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Financing Available Through Stripe Capital
                        </CardTitle>
                        <CardDescription>
                            Fund your training with flexible financing based on your earnings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">You&apos;re eligible for Stripe Capital financing</p>
                                <p className="text-sm text-muted-foreground">
                                    Access funding to invest in your professional development and qualifications
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Repay automatically from future earnings</p>
                                <p className="text-sm text-muted-foreground">
                                    A fixed percentage is withheld from each payment you receive on the platform
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">No fixed monthly payments</p>
                                <p className="text-sm text-muted-foreground">
                                    Repayments scale with your business - you only repay when you earn
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        {capitalOffer.dashboardUrl && (
                            <Button asChild>
                                <a 
                                    href={capitalOffer.dashboardUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                >
                                    View Financing Offers
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}

            {/* Stripe Connect Setup Card for Tradespeople without account */}
            {!loading && isTradesperson === true && !capitalOffer?.hasAccount && (
                <Card className="mb-8 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            Set Up Payments to Access Financing
                        </CardTitle>
                        <CardDescription>
                            Complete your Stripe Connect setup to become eligible for Capital financing
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">
                            To access flexible financing options for your training, you need to set up 
                            your payment account first. This will also allow you to receive payments for jobs.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/dashboard/payouts">
                                Set Up Payments
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* How It Works */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        How It Works
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    1
                                </div>
                                <h3 className="font-semibold">Choose Your Course</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Browse our selection of professional qualifications and training courses
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    2
                                </div>
                                <h3 className="font-semibold">Apply for Financing</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                If eligible, use Stripe Capital to fund your training without upfront costs
                            </p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    3
                                </div>
                                <h3 className="font-semibold">Earn & Repay</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Complete jobs on the platform and repay automatically from your earnings
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Available Courses */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Available Courses</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {COURSES.map((course) => (
                        <Card key={course.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl">{course.title}</CardTitle>
                                <CardDescription className="text-sm">
                                    {course.level} • {course.duration}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {course.description}
                                </p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4" />
                                        <span>{course.certification}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        <span className="font-semibold text-lg">
                                            {formatCurrency(course.price)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button className="w-full" disabled>
                                    Coming Soon
                                </Button>
                                {capitalOffer?.eligible && capitalOffer?.capitalEnabled && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        Financing available through Stripe Capital
                                    </p>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Benefits Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Why Choose NeedaTradesman Academy?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Industry-Recognized Qualifications
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                All courses lead to nationally recognized certifications that enhance your credibility
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Flexible Learning
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Study at your own pace with options for online, in-person, and blended learning
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Financing Available
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Eligible tradespeople can access Stripe Capital to fund training with flexible repayment
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Boost Your Profile
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Completed qualifications are highlighted on your tradesperson profile
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
