"use client";

import { UserRole } from "@prisma/client";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome!</h2>
          <p className="mt-2 text-gray-600">
            Tell us how you&apos;d like to use our platform
          </p>
        </div>

        <div className="space-y-4">
          <RoleCard
            userRole="CUSTOMER"
            title="I need work done"
            description="Post jobs and hire trusted tradespeople"
            icon="🏠"
          />

          <RoleCard
            userRole="TRADESPERSON"
            title="I'm a tradesperson"
            description="Find work and grow your business"
            icon="🔨"
          />
        </div>
      </div>
    </div>
  );
}

interface RoleCardProps {
  userRole: UserRole;
  title: string;
  description: string;
  icon: string;
}

function RoleCard({ userRole, title, description, icon }: RoleCardProps) {
  const handleRoleSelect = async () => {
    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: userRole }),
      });

      if (response.ok) {
        // Redirect to dashboard based on role
        window.location.href = "/dashboard";
      } else {
        console.error("Failed to set user role");
      }
    } catch (error) {
      console.error("Error setting user role:", error);
    }
  };

  return (
    <button
      onClick={handleRoleSelect}
      className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
    >
      <div className="flex items-center space-x-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
}
