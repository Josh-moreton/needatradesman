"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, Hammer, ArrowRight } from "lucide-react";

export default function OnboardingFlow() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const router = useRouter();

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
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
        router.push("/dashboard");
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="w-full max-w-2xl space-y-8">
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
            isLoading={isLoading && selectedRole === UserRole.TRADESPERSON}
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
