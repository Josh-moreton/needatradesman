import { SignIn } from "@clerk/nextjs";

export default function SignInCatchAll() {
  return <SignIn fallbackRedirectUrl="/onboarding" />;
}
