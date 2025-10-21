/**
 * Plain text generator for email templates
 * Converts React Email components to plain text for email clients that don't support HTML
 */

/**
 * Generate plain text version of Welcome email
 */
export function generateWelcomeEmailPlainText(params: {
  userName: string;
  userRole: 'customer' | 'tradesperson';
  dashboardUrl: string;
}): string {
  const { userName, userRole, dashboardUrl } = params;
  
  return `
Welcome to Need a Tradesman!

Hi ${userName},

Thank you for joining Need a Tradesman as a ${userRole}. We're excited to have you on board!

${userRole === 'customer' 
  ? `Getting Started:
- Post your first job and describe what you need
- Review applications from skilled tradespeople
- Choose the right tradesperson for your project
- Make secure payments through our platform`
  : `Getting Started:
- Browse available jobs in your area
- Apply to jobs that match your skills
- Connect with customers directly
- Get paid securely through Stripe Connect`}

Go to Dashboard: ${dashboardUrl}

---
Need a Tradesman - Connecting customers with skilled tradespeople
© ${new Date().getFullYear()} Need a Tradesman. All rights reserved.
  `.trim();
}

/**
 * Generate plain text version of Job Response email
 */
export function generateJobResponseEmailPlainText(params: {
  customerName: string;
  tradespersonName: string;
  jobTitle: string;
  message: string;
  quote?: number;
  jobUrl: string;
}): string {
  const { customerName, tradespersonName, jobTitle, message, quote, jobUrl } = params;
  
  return `
New Application for Your Job

Hi ${customerName},

${tradespersonName} has applied for your job: ${jobTitle}

Application Message:
${message}
${quote ? `\nQuoted Price: £${quote}` : ''}

View Application: ${jobUrl}

---
Need a Tradesman - Connecting customers with skilled tradespeople
© ${new Date().getFullYear()} Need a Tradesman. All rights reserved.
  `.trim();
}

/**
 * Generate plain text version of Digest email
 */
export function generateDigestEmailPlainText(params: {
  firstName: string;
  jobCount: number;
  jobs: Array<{ title: string; location: string; budget?: number; category: string }>;
  frequency: 'daily' | 'weekly';
  viewAllUrl: string;
  managePreferencesUrl: string;
  unsubscribeUrl: string;
}): string {
  const { firstName, jobCount, jobs, frequency, viewAllUrl, managePreferencesUrl, unsubscribeUrl } = params;
  
  const jobsText = jobs.map(job => 
    `- ${job.title} (${job.category}) in ${job.location}${job.budget ? ` - Budget: £${job.budget}` : ''}`
  ).join('\n');
  
  return `
${frequency === 'daily' ? 'Daily' : 'Weekly'} Job Digest

Hi ${firstName},

Here are ${jobCount} new job${jobCount === 1 ? '' : 's'} matching your preferences:

${jobsText}

View All Jobs: ${viewAllUrl}

Manage your email preferences or change frequency: ${managePreferencesUrl}

If you no longer wish to receive these digests, unsubscribe here: ${unsubscribeUrl}

---
Need a Tradesman - Connecting customers with skilled tradespeople
© ${new Date().getFullYear()} Need a Tradesman. All rights reserved.
  `.trim();
}

/**
 * Generate plain text version of Support Alert email
 */
export function generateSupportAlertEmailPlainText(params: {
  entityType: string;
  entityId: string;
  reason: string;
  details: string;
  reportedBy?: string;
  adminUrl: string;
}): string {
  const { entityType, entityId, reason, details, reportedBy, adminUrl } = params;
  
  return `
Abuse Flag Raised - Immediate Attention Required

Entity Type: ${entityType}
Entity ID: ${entityId}
Reason: ${reason}
${reportedBy ? `Reported By: ${reportedBy}` : ''}

Details:
${details}

Review in admin panel: ${adminUrl}

---
Need a Tradesman Support Team
This is an automated alert.
  `.trim();
}
