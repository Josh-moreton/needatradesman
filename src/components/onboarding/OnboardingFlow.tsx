"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useSession } from "@clerk/nextjs";
import { UserRole, JobCategory } from "@/lib/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Home, Hammer, ArrowRight, ArrowLeft } from "lucide-react";

export default function OnboardingFlow() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState<"role" | "trades">("role");
  const [selectedTrades, setSelectedTrades] = useState<JobCategory[]>([]);
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();

  // Check if user has already completed onboarding but metadata hasn't propagated yet
  useEffect(() => {
    const checkOnboardingStatus = () => {
      if (user?.publicMetadata?.onboardingComplete) {
        // User has completed onboarding, redirect them
        window.location.href = "/dashboard";
      }
    };

    // Check immediately and then after a delay to catch metadata updates
    checkOnboardingStatus();
    const timeoutId = setTimeout(checkOnboardingStatus, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [user]);

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);

    if (role === UserRole.CUSTOMER) {
      // For customers, complete onboarding immediately
      setIsLoading(true);
      try {
        const response = await fetch("/api/user/role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        });

        if (response.ok) {
          try {
            console.log('Role API call successful, refreshing session...');
            
            // Force refresh the session to get updated metadata immediately
            await session?.reload();
            
            console.log('Session refreshed, redirecting...');
            
            // Now redirect - the middleware should see the updated session
            if (role === UserRole.CUSTOMER) {
              window.location.href = "/jobs/new";
            } else {
              window.location.href = "/dashboard";
            }
          } catch (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // Fallback to the old retry mechanism
            const checkMetadataAndRedirect = async (attempts = 0) => {
              const maxAttempts = 10;
              
              if (attempts >= maxAttempts) {
                if (role === UserRole.CUSTOMER) {
                  window.location.href = "/jobs/new";
                } else {
                  window.location.href = "/dashboard";
                }
                return;
              }

              await user?.reload();
              
              if (user?.publicMetadata?.onboardingComplete) {
                if (role === UserRole.CUSTOMER) {
                  window.location.href = "/jobs/new";
                } else {
                  window.location.href = "/dashboard";
                }
              } else {
                setTimeout(() => checkMetadataAndRedirect(attempts + 1), 500);
              }
            };

            checkMetadataAndRedirect();
          }
        } else {
          console.error("Failed to set user role");
          setIsLoading(false);
          setSelectedRole(null);
        }
      } catch (error) {
        console.error("Error setting user role:", error);
        setIsLoading(false);
        setSelectedRole(null);
      }
    } else {
      // For tradespeople, go to trade selection step
      setStep("trades");
    }
  };

  const handleTradeToggle = (trade: JobCategory) => {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  };

  const handleCompleteTradespersonOnboarding = async () => {
    if (selectedTrades.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: UserRole.TRADESPERSON,
          trades: selectedTrades,
        }),
      });

      if (response.ok) {
        try {
          console.log('Tradesperson role API call successful, refreshing session...');
          
          // Force refresh the session to get updated metadata immediately
          await session?.reload();
          
          console.log('Session refreshed, redirecting to dashboard...');
          
          // Now redirect - the middleware should see the updated session
          window.location.href = "/dashboard";
        } catch (refreshError) {
          console.error('Error refreshing session:', refreshError);
          // Fallback to the old retry mechanism
          const checkMetadataAndRedirect = async (attempts = 0) => {
            const maxAttempts = 10;
            
            if (attempts >= maxAttempts) {
              window.location.href = "/dashboard";
              return;
            }

            await user?.reload();
            
            if (user?.publicMetadata?.onboardingComplete) {
              window.location.href = "/dashboard";
            } else {
              setTimeout(() => checkMetadataAndRedirect(attempts + 1), 500);
            }
          };

          checkMetadataAndRedirect();
        }
      } else {
        console.error("Failed to set user role and trades");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error setting user role and trades:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-2xl space-y-8">
        {step === "role" ? (
          <>
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="px-4 py-1 text-sm">
                  Welcome to Need A Tradesman
                </Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Let&apos;s get you started
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Tell us how you&apos;d like to use our platform so we can
                personalize your experience
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <RoleCard
                role={UserRole.CUSTOMER}
                title="I need work done"
                description="Post jobs and hire trusted tradespeople for your home projects"
                icon={<Home className="h-12 w-12" />}
                features={[
                  "Post unlimited job listings",
                  "Get quotes from verified tradespeople",
                  "Secure payment system",
                  "Rate and review tradespeople",
                ]}
                isSelected={selectedRole === UserRole.CUSTOMER}
                isLoading={isLoading && selectedRole === UserRole.CUSTOMER}
                onSelect={() => handleRoleSelect(UserRole.CUSTOMER)}
              />

              <RoleCard
                role={UserRole.TRADESPERSON}
                title="I'm a tradesperson"
                description="Find work opportunities and grow your business with new customers"
                icon={<Hammer className="h-12 w-12" />}
                features={[
                  "Browse available job opportunities",
                  "Build your professional profile",
                  "Direct messaging with customers",
                  "Secure and fast payments",
                ]}
                isSelected={selectedRole === UserRole.TRADESPERSON}
                isLoading={false}
                onSelect={() => handleRoleSelect(UserRole.TRADESPERSON)}
              />
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                You can always change your account type later in your profile
                settings
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Trade Selection Step */}
            <div className="text-center space-y-4">
              <Button
                variant="ghost"
                onClick={() => setStep("role")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="px-4 py-1 text-sm">
                  Step 2 of 2
                </Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Select your trades
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Choose the trades you specialize in. You can select multiple
                trades and update these later.
              </p>
            </div>

            {/* Trade Selection */}
            <Card>
              <CardHeader>
                <CardTitle>What trades do you work in?</CardTitle>
                <CardDescription>
                  Select all that apply. This helps us show you relevant job
                  opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.values(JobCategory) as JobCategory[]).map(
                    (trade) => (
                      <div key={trade} className="flex items-center space-x-2">
                        <Checkbox
                          id={trade}
                          checked={selectedTrades.includes(trade)}
                          onCheckedChange={() => handleTradeToggle(trade)}
                        />
                        <label
                          htmlFor={trade}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {trade
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </label>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleCompleteTradespersonOnboarding}
                    disabled={selectedTrades.length === 0 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        Complete setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  {selectedTrades.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Please select at least one trade to continue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

interface RoleCardProps {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
}

function RoleCard({
  title,
  description,
  icon,
  features,
  isSelected,
  isLoading,
  onSelect,
}: RoleCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 shadow-lg"
          : "hover:shadow-md"
      }`}
      onClick={!isLoading ? onSelect : undefined}
    >
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div
            className={`p-4 rounded-full ${
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
            } transition-colors`}
          >
            {icon}
          </div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <ArrowRight className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          variant={isSelected ? "default" : "outline"}
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoading) onSelect();
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your account...
            </>
          ) : (
            `Choose ${title.toLowerCase()}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
