import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('clerk-webhook');

type UserEventData = {
    id: string;
    email_addresses: Array<{ id: string; email_address: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
}

type UserDeletedEventData = {
    id: string;
}

function extractPrimaryEmail(data: UserEventData): string | null {
    const primaryEmail = data.email_addresses.find(
        (email) => email.id === data.primary_email_address_id
    );
    return primaryEmail?.email_address || null;
}

async function handleUserCreated(data: UserEventData): Promise<NextResponse | null> {
    const { id: clerkId, first_name, last_name } = data;
    const email = extractPrimaryEmail(data);

    if (!email) {
        logger.error({ clerkId }, 'No email found for user');
        return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    try {
        await prisma.user.upsert({
            where: { clerkId },
            create: {
                clerkId,
                email,
                firstName: first_name || null,
                lastName: last_name || null,
            },
            update: {
                email,
                firstName: first_name || null,
                lastName: last_name || null,
            },
        });
        logger.info({ clerkId }, 'User synced to database');
    } catch (error) {
        logger.error({ error }, 'Error syncing user to database');
        return NextResponse.json({ error: 'Database sync failed' }, { status: 500 });
    }

    return null;
}

async function handleUserUpdated(data: UserEventData): Promise<NextResponse | null> {
    const { id: clerkId, first_name, last_name } = data;
    const email = extractPrimaryEmail(data);

    if (!email) {
        logger.error({ clerkId }, 'No email found for user');
        return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { clerkId }
        });

        if (existingUser) {
            await prisma.user.update({
                where: { clerkId },
                data: {
                    email,
                    firstName: first_name || null,
                    lastName: last_name || null,
                },
            });
            logger.info({ clerkId }, 'User updated in database');
        }
    } catch (error) {
        logger.error({ error }, 'Error updating user in database');
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return null;
}

async function handleUserDeleted(data: UserDeletedEventData): Promise<void> {
    const { id: clerkId } = data;

    try {
        await prisma.user.delete({
            where: { clerkId }
        });
        logger.info({ clerkId }, 'User deleted from database');
    } catch (error) {
        logger.error({ error }, 'Error deleting user from database');
    }
}

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
        logger.error({ error: err }, 'Error verifying webhook')
        return new Response('Error occurred', {
            status: 400,
        })
    }

    // Handle the webhook
    const { id } = evt.data
    const eventType = evt.type

    logger.info({ id, eventType }, 'Webhook received')
    logger.debug({ body }, 'Webhook body')

    let response: NextResponse | null = null;

    if (eventType === 'user.created') {
        response = await handleUserCreated(evt.data as unknown as UserEventData);
    } else if (eventType === 'user.updated') {
        response = await handleUserUpdated(evt.data as unknown as UserEventData);
    } else if (eventType === 'user.deleted') {
        await handleUserDeleted(evt.data as unknown as UserDeletedEventData);
    }

    return response || new Response('', { status: 200 })
}
