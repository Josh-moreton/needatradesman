"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Crisp } from "crisp-sdk-web";

export function CrispChat() {
  const { data: session, status } = useSession();

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
    if (status === "authenticated" && session?.user) {
      // Set user email
      if (session.user.email) {
        Crisp.user.setEmail(session.user.email);
      }

      // Set user name
      if (session.user.name) {
        Crisp.user.setNickname(session.user.name);
      }

      // Set user ID for tracking
      Crisp.session.setData({
        user_id: session.user.id,
      });
    }
  }, [session, status]);

  return null; // Crisp widget is injected into the DOM
}
