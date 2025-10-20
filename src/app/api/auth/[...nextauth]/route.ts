import { handlers } from "@/auth";

// Auth.js email provider (nodemailer) requires Node.js runtime, not Edge
export const runtime = "nodejs";

export const { GET, POST } = handlers;
