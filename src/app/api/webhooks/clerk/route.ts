import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    // Get the webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error occurred -- no svix headers', {
            status: 400,
        })
    }

    // Get the body
    const payload = await req.text()
    const body = JSON.parse(payload)

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    // Verify the payload with the headers
    try {
        evt = wh.verify(payload, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return new Response('Error occurred', {
            status: 400,
        })
    }

    // Handle the webhook
    const { id } = evt.data
    const eventType = evt.type

    console.log(`Webhook with and ID of ${id} and type of ${eventType}`)
    console.log('Webhook body:', body)

    // Handle user.created event
    if (eventType === 'user.created') {
        const { id: clerkId, email_addresses, first_name, last_name } = evt.data

        try {
            // Get the primary email address
            const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)
            const email = primaryEmail?.email_address

            if (!email) {
                console.error('No email found for user', clerkId)
                return NextResponse.json({ error: 'No email found' }, { status: 400 })
            }

            // Upsert user in database - without role initially (they will set it during onboarding)
            await prisma.user.upsert({
                where: { clerkId },
                create: {
                    clerkId,
                    email,
                    firstName: first_name || null,
                    lastName: last_name || null,
                    role: 'CUSTOMER', // Default role - will be updated during onboarding
                },
                update: {
                    email,
                    firstName: first_name || null,
                    lastName: last_name || null,
                },
            })

            console.log('User synced to database:', clerkId)
        } catch (error) {
            console.error('Error syncing user to database:', error)
            return NextResponse.json({ error: 'Database sync failed' }, { status: 500 })
        }
    }

    // Handle user.updated event
    if (eventType === 'user.updated') {
        const { id: clerkId, email_addresses, first_name, last_name } = evt.data

        try {
            // Get the primary email address
            const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)
            const email = primaryEmail?.email_address

            if (!email) {
                console.error('No email found for user', clerkId)
                return NextResponse.json({ error: 'No email found' }, { status: 400 })
            }

            // Update user in database if they exist
            const existingUser = await prisma.user.findUnique({
                where: { clerkId }
            })

            if (existingUser) {
                await prisma.user.update({
                    where: { clerkId },
                    data: {
                        email,
                        firstName: first_name || null,
                        lastName: last_name || null,
                    },
                })
                console.log('User updated in database:', clerkId)
            }
        } catch (error) {
            console.error('Error updating user in database:', error)
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
    }

    // Handle user.deleted event
    if (eventType === 'user.deleted') {
        const { id: clerkId } = evt.data

        try {
            // Soft delete or remove user from database
            await prisma.user.delete({
                where: { clerkId }
            })
            console.log('User deleted from database:', clerkId)
        } catch (error) {
            console.error('Error deleting user from database:', error)
            // Don't return error for delete operations as user might not exist
        }
    }

    return new Response('', { status: 200 })
}
