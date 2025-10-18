import { z } from 'zod'
import { UserRole, JobCategory, JobStatus, ApplicationStatus, MessageType, TicketStatus, TicketPriority, TicketRole } from '@prisma/client'

// Allowed domains for attachment URLs (can be overridden via environment variable)
const getAllowedDomains = (): string[] => {
    const envDomains = process.env.NEXT_PUBLIC_ALLOWED_ATTACHMENT_DOMAINS;
    if (envDomains) {
        return envDomains.split(',').map(d => d.trim());
    }
    // Default allowed domains - update these to match your S3/CDN configuration
    return [
        's3.amazonaws.com',
        'cloudfront.net',
        'r2.cloudflarestorage.com',
        'storage.googleapis.com',
    ];
};

// Attachment validation schema
export const attachmentSchema = z.object({
    url: z.string().url('Invalid URL format').refine((url) => {
        // Whitelist allowed domains to prevent XSS via malicious URLs
        const allowedDomains = getAllowedDomains();
        try {
            const urlObj = new URL(url);
            // Check if the hostname ends with any of the allowed domains
            return allowedDomains.some(domain =>
                urlObj.hostname.endsWith(domain) || urlObj.hostname === domain
            );
        } catch {
            return false;
        }
    }, {
        message: "Attachment URL must be from an allowed domain"
    }),
    filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
    size: z.number().positive('File size must be positive').max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
});

// Location data schema for structured location input
export const locationDataSchema = z.object({
    displayText: z.string().min(1, 'Location is required'),
    formattedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    postcode: z.string().optional(),
});

// Zod schemas for validation
export const createJobSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
    category: z.nativeEnum(JobCategory),
    // Accept either a simple string or structured location data; validation below ensures one exists
    location: z.string().optional(), // Legacy support
    locationData: locationDataSchema.optional(), // Structured location data
    budget: z.number().positive('Budget must be positive').optional(),
    attachments: z.array(attachmentSchema).max(5, 'Maximum 5 attachments allowed').optional(),
}).superRefine((data, ctx) => {
    const hasLocationString = typeof data.location === 'string' && data.location.trim().length > 0
    const hasStructured = !!data.locationData
    if (!hasLocationString && !hasStructured) {
        // Attach the error to locationData since our UI is bound to that field
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Location is required',
            path: ['locationData'],
        })
    }
})

export const quoteItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
})

export const createApplicationSchema = z.object({
    message: z.string().min(10, 'Message must be at least 10 characters').max(500, 'Message too long'),
    quote: z.number().positive('Quote must be positive').optional(),
    quoteItems: z.array(quoteItemSchema).optional(),
    depositPercentage: z.number().min(0, 'Deposit percentage cannot be negative').max(100, 'Deposit percentage cannot exceed 100%').default(50).optional(),
    requiresDeposit: z.boolean().default(true).optional(),
})

export const createMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
    receiverId: z.string().cuid(),
    jobId: z.string().cuid().optional(),
    messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
})

export const updateUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    role: z.nativeEnum(UserRole).optional(),
    trades: z.array(z.nativeEnum(JobCategory)).min(1, 'At least one trade must be selected').optional(),
})

// Ticket schemas
export const createTicketSchema = z.object({
    category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
    priority: z.nativeEnum(TicketPriority),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    body: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
})

export const createTicketMessageSchema = z.object({
    body: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
})

export const updateTicketSchema = z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    assigneeId: z.string().cuid().nullable().optional(),
})

// Type exports
export type Attachment = z.infer<typeof attachmentSchema>
export type LocationData = z.infer<typeof locationDataSchema>
export type CreateJobInput = z.infer<typeof createJobSchema>
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type QuoteItem = z.infer<typeof quoteItemSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>

// Export enums for easy access
export { UserRole, JobCategory, JobStatus, ApplicationStatus, MessageType, TicketStatus, TicketPriority, TicketRole }
