import { SignUp } from "@clerk/nextjs";

export default function SignUpCatchAll() {
  return <SignUp fallbackRedirectUrl="/dashboard" />;
}
