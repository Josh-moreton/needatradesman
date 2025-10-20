"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Crisp } from "crisp-sdk-web";

export function CrispChat() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Only initialize if we have the website ID
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    
    if (!websiteId) {
      console.warn("NEXT_PUBLIC_CRISP_WEBSITE_ID is not set. Crisp chat will not be loaded.");
      return;
    }

    // Configure Crisp
    Crisp.configure(websiteId);

    // Set user data if authenticated
    if (isLoaded && user) {
      // Set user email
      if (user.primaryEmailAddress?.emailAddress) {
        Crisp.user.setEmail(user.primaryEmailAddress.emailAddress);
      }

      // Set user name
      const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (name) {
        Crisp.user.setNickname(name);
      }

      // Set user ID for tracking
      Crisp.session.setData({
        user_id: user.id,
        clerk_id: user.id,
      });
    }
  }, [user, isLoaded]);

  return null; // Crisp widget is injected into the DOM
}
