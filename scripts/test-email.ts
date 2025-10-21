/**
 * Test script to send a test email via Resend
 * Usage: npx tsx --env-file=.env scripts/test-email.ts <your-email@example.com>
 * 
 * Or add to package.json scripts:
 * "test:email": "tsx --env-file=.env scripts/test-email.ts"
 */

import { resend, FROM_EMAIL } from '../src/lib/resend';

// Get all recipient emails from command line arguments
const recipientEmails = process.argv.slice(2);

if (recipientEmails.length === 0) {
    console.error('❌ Please provide at least one recipient email address');
    console.log('Usage: npx tsx --env-file=.env scripts/test-email.ts <email1@example.com> [email2@example.com] ...');
    console.log('\nOr comma-separated: npx tsx --env-file=.env scripts/test-email.ts email1@example.com,email2@example.com');
    process.exit(1);
}

// Handle comma-separated emails
const allEmails = recipientEmails.flatMap(arg => arg.split(',').map(e => e.trim())).filter(e => e.length > 0);

async function sendTestEmail() {
    try {
        console.log(`📧 Sending test email to ${allEmails.length} recipient(s)`);
        console.log(`📤 From: ${FROM_EMAIL}`);
        console.log(`📬 Recipients: ${allEmails.slice(0, 5).join(', ')}${allEmails.length > 5 ? `... and ${allEmails.length - 5} more` : ''}`);

        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: allEmails,
            subject: 'Test Email - Need a Tradesman',
            html: `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #1a202c; margin-top: 0;">Test Email - Need a Tradesman</h2>
                <p>Hi there,</p>
                <p>This is a test email to verify deliverability and check if emails are going to spam/junk.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">What to check:</h3>
                  <ul style="padding-left: 20px; margin: 10px 0;">
                    <li>Did this email arrive in your <strong>Inbox</strong> or <strong>Spam/Junk</strong> folder?</li>
                    <li>Does the sender show as <code>${FROM_EMAIL}</code>?</li>
                    <li>Are there any security warnings?</li>
                    <li>How does the formatting look?</li>
                  </ul>
                </div>

                <a
                  href="https://needatradesman.co.uk"
                  style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;"
                >
                  Visit Website
                </a>
                
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  If this email landed in spam, please mark it as "Not Spam" to improve deliverability.
                </p>
              </div>
              <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666;">
                <p style="margin: 5px 0;">Need a Tradesman - Connecting customers with skilled tradespeople</p>
                <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} Need a Tradesman. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
            text: `
Test Email - Need a Tradesman

Hi there,

This is a test email to verify deliverability and check if emails are going to spam/junk.

What to check:
- Did this email arrive in your Inbox or Spam/Junk folder?
- Does the sender show as ${FROM_EMAIL}?
- Are there any security warnings?
- How does the formatting look?

Visit Website: https://needatradesman.co.uk

If this email landed in spam, please mark it as "Not Spam" to improve deliverability.

---
Need a Tradesman - Connecting customers with skilled tradespeople
© ${new Date().getFullYear()} Need a Tradesman. All rights reserved.
      `.trim(),
        });

        if (result.data) {
            console.log('✅ Email sent successfully!');
            console.log(`📨 Message ID: ${result.data.id}`);
            console.log(`\n📍 Track delivery in Resend Dashboard:`);
            console.log(`   https://resend.com/emails/${result.data.id}`);
            console.log(`\n⏰ Check your email inbox (and spam/junk folder) now.`);
        }
    } catch (error) {
        console.error('❌ Error sending email:', error);
        if (error instanceof Error) {
            console.error('Details:', error.message);
        }
        process.exit(1);
    }
}

sendTestEmail();
