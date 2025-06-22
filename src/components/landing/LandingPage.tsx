"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Home,
  Hammer,
  Star,
  CheckCircle,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If user is signed in, redirect to dashboard
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isLoaded, router]);

  // Don't render anything while checking auth state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If signed in, don't render the landing page (redirect is happening)
  if (isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Change this gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/30 px-4 py-24 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm">
              🚀 Trusted by 10,000+ customers
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Need a <span className="text-primary">Tradesman</span>?
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect with trusted, verified tradespeople in your area. Post
              jobs, get competitive quotes, and hire with complete confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <SignUpButton mode="modal">
                <Button size="lg" className="px-8 py-3 text-lg">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>

              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 text-lg"
                >
                  Sign In
                </Button>
              </SignInButton>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Verified Professionals
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-accent" />
                5-Star Rated
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Instant Quotes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perfect for Everyone
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re a homeowner needing work done or a
              tradesperson looking for opportunities, we&apos;ve got you
              covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* For Homeowners */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Home className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl text-foreground">
                  For Homeowners
                </CardTitle>
                <CardDescription className="text-lg">
                  Get your home projects completed by trusted professionals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Post jobs in minutes
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Receive multiple competitive quotes
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Choose from verified tradespeople
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Secure payment protection
                    </span>
                  </div>
                </div>

                <SignUpButton mode="modal">
                  <Button className="w-full mt-6" size="lg">
                    Post a Job
                  </Button>
                </SignUpButton>
              </CardContent>
            </Card>

            {/* For Tradespeople */}
            <Card className="relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                  <Hammer className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl text-foreground">
                  For Tradespeople
                </CardTitle>
                <CardDescription className="text-lg">
                  Find quality work opportunities and grow your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Browse local job opportunities
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Set your own rates and schedule
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Build your reputation with reviews
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-foreground">
                      Get paid securely and on time
                    </span>
                  </div>
                </div>

                <SignUpButton mode="modal">
                  <Button className="w-full mt-6" variant="outline" size="lg">
                    Join as Tradesperson
                  </Button>
                </SignUpButton>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Change this background */}
      <section className="bg-primary/5 py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Need a Tradesman?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make it easy, safe, and affordable to get your projects done
              right.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="text-center border-0 shadow-md">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  Verified Professionals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  All tradespeople are background checked, insured, and verified
                  for your peace of mind.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-md">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Fast Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get quotes within hours, not days. Most jobs receive multiple
                  responses within 24 hours.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-md">
              <CardHeader>
                <div className="mx-auto mb-4 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Quality Guaranteed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Read reviews from real customers and enjoy our satisfaction
                  guarantee on all completed work.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-primary-foreground/80">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5,000+</div>
              <div className="text-primary-foreground/80">
                Verified Tradespeople
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-primary-foreground/80">Jobs Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9/5</div>
              <div className="text-primary-foreground/80">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Change this background */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-24 sm:py-32">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of satisfied customers and professionals. Your next
            project is just a click away.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8 py-3 text-lg">
                Post Your First Job <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignUpButton>

            <SignUpButton mode="modal">
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                Join as Professional
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>
    </div>
  );
}
