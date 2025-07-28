"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

// Linear-inspired animation variants
const fadeInUp = {
  initial: {
    opacity: 0,
    y: 40,
    filter: "blur(8px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 2, // slowed down from 0.8
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const slideInFromRight = {
  initial: {
    opacity: 0,
    x: 60,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      delay: 0.2,
    },
  },
};

export default function LandingPageAnimated() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/onboarding");
    }
  }, [isSignedIn, isLoaded, router]);

  // Add debug logging
  useEffect(() => {
    console.log(
      "LandingPageAnimated - isLoaded:",
      isLoaded,
      "isSignedIn:",
      isSignedIn
    );
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  console.log(
    "LandingPageAnimated - Rendering main landing page with animations"
  );

  return (
    <div className="flex flex-col">
      {/* Hero Section - Full Screen */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/30 min-h-screen flex items-center justify-center px-2 sm:px-4 lg:px-8">
        <div className="container mx-auto">
          <motion.div
            className="text-center max-w-4xl mx-auto px-2 sm:px-0"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-6 text-sm">
                🚀 Trusted by 10,000+ customers
              </Badge>
            </motion.div>

            <motion.h1
              className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-6 sm:mb-8 leading-tight break-words"
              variants={fadeInUp}
            >
              Need a <span className="text-primary">Tradesman</span>?
            </motion.h1>

            <motion.p
              className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed"
              variants={fadeInUp}
            >
              Connect with trusted, verified tradespeople in your area. Post
              jobs, get competitive quotes, and hire with complete confidence.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-12 sm:mb-20 w-full items-center"
              variants={fadeInUp}
            >
              <SignUpButton mode="modal">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-6 py-3 sm:px-10 sm:py-4 text-lg sm:text-xl inline-flex items-center mb-3 sm:mb-0"
                  >
                    Get Started <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </motion.div>
              </SignUpButton>

              <SignInButton mode="modal">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-6 py-3 sm:px-10 sm:py-4 text-lg sm:text-xl"
                  >
                    Sign In
                  </Button>
                </motion.div>
              </SignInButton>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 text-sm sm:text-base text-muted-foreground mt-8 sm:mt-12 pb-8 sm:pb-0"
              variants={fadeInUp}
            >
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Shield className="h-6 w-6 text-primary" />
                Verified Professionals
              </motion.div>
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Star className="h-6 w-6 text-accent" />
                5-Star Rated
              </motion.div>
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <CheckCircle className="h-6 w-6 text-primary" />
                Instant Quotes
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center"
          >
            <motion.div
              className="w-1 h-3 bg-muted-foreground/50 rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </section>{" "}
      {/* User Types Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perfect for Everyone
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re a homeowner needing work done or a
              tradesperson looking for opportunities, we&apos;ve got you
              covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* For Homeowners */}
            <motion.div
              initial={{ opacity: 0, x: -60, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full">
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
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button className="w-full mt-6" size="lg">
                        Post a Job
                      </Button>
                    </motion.div>
                  </SignUpButton>
                </CardContent>
              </Card>
            </motion.div>

            {/* For Tradespeople */}
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                delay: 0.1,
              }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <Card className="relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg h-full">
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
                        Send competitive quotes
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
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full mt-6"
                        size="lg"
                      >
                        Find Work
                      </Button>
                    </motion.div>
                  </SignUpButton>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Features Section with more Linear-style animations */}
      <section className="bg-primary/5 py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Need A Tradesman?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We&apos;ve built the most trusted marketplace for connecting
              homeowners with skilled professionals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Verified Professionals",
                description:
                  "All tradespeople are background checked and verified",
              },
              {
                icon: Star,
                title: "Quality Guaranteed",
                description:
                  "5-star rated professionals with proven track records",
              },
              {
                icon: Clock,
                title: "Fast Responses",
                description: "Get quotes within hours, not days",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  delay: index * 0.1,
                }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="text-center p-8 bg-background rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-300"
              >
                <div className="mx-auto mb-6 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers and professionals on our
              platform.
            </p>
            <SignUpButton mode="modal">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="secondary"
                  className="px-8 py-3 text-lg"
                >
                  Get Started Today <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </SignUpButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
