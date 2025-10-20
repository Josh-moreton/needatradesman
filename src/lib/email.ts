// Centralized exports for email functionality
export { resend, FROM_EMAIL } from './resend';
export {
    sendNewApplicationEmail,
    sendJobStatusUpdateEmail,
    sendNewMessageEmail,
    sendPaymentConfirmationEmail,
    sendWelcomeEmail,
} from './emails/send';
export type { } from './emails/send';
