import { Resend } from 'resend';

// Get API key from RESEND_API_KEY (created automatically by Vercel integration)
// or fall back to extracting it from EMAIL_SERVER connection string
let apiKey: string | undefined = process.env.RESEND_API_KEY;

if (!apiKey) {
    // Fall back to EMAIL_SERVER format: smtp://resend:<API_KEY>@smtp.resend.com:587
    const emailServer = process.env.EMAIL_SERVER;
    if (emailServer) {
        const regex = /resend:([^@]+)@/;
        const apiKeyMatch = regex.exec(emailServer);
        apiKey = apiKeyMatch?.[1];
    }
}

if (!apiKey) {
    throw new Error(
        'Missing Resend API key. Please set either RESEND_API_KEY or EMAIL_SERVER environment variable.'
    );
}

export const resend = new Resend(apiKey);

// Default sender email from environment
export const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@needatradesman.co.uk';
