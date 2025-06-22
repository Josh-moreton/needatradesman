import { z } from 'zod'
import { UserRole, JobCategory, JobStatus, ApplicationStatus, MessageType } from '@prisma/client'

// Zod schemas for validation
export const createJobSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
    category: z.nativeEnum(JobCategory),
    location: z.string().min(1, 'Location is required'),
    budget: z.number().positive('Budget must be positive').optional(),
    attachments: z.array(z.string().url()).optional(),
})

export const createApplicationSchema = z.object({
    message: z.string().min(10, 'Message must be at least 10 characters').max(500, 'Message too long'),
    quote: z.number().positive('Quote must be positive').optional(),
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

// Type exports
export type CreateJobInput = z.infer<typeof createJobSchema>
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// Export enums for easy access
export { UserRole, JobCategory, JobStatus, ApplicationStatus, MessageType }
