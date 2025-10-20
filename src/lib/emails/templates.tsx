import * as React from 'react';

// Email templates using React components
// Resend supports React components for email rendering

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://needatradesman.co.uk';

interface EmailLayoutProps {
  children: React.ReactNode;
  preheader?: string;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({ children, preheader }) => (
  <html lang="en">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333', backgroundColor: '#f5f5f5', margin: 0, padding: 0 }}>
      {preheader && (
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden' }}>
          {preheader}
        </div>
      )}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {children}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <p style={{ margin: '5px 0' }}>Need a Tradesman - Connecting customers with skilled tradespeople</p>
          <p style={{ margin: '5px 0' }}>&copy; {new Date().getFullYear()} Need a Tradesman. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
);

interface NewApplicationEmailProps {
  customerName: string;
  tradespersonName: string;
  jobTitle: string;
  message: string;
  quote?: string;
  jobUrl: string;
}

export const NewApplicationEmail: React.FC<NewApplicationEmailProps> = ({
  customerName,
  tradespersonName,
  jobTitle,
  message,
  quote,
  jobUrl,
}) => (
  <EmailLayout>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>New Application for Your Job</h2>
    <p>Hi {customerName},</p>
    <p>
      <strong>{tradespersonName}</strong> has applied for your job: <strong>{jobTitle}</strong>
    </p>
    
    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      <h3 style={{ marginTop: 0, color: '#1a202c' }}>Application Message:</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
      
      {quote && (
        <p style={{ marginTop: '10px' }}>
          <strong>Quoted Price:</strong> £{quote}
        </p>
      )}
    </div>

    <a
      href={jobUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      View Application
    </a>
  </EmailLayout>
);

interface JobStatusUpdateEmailProps {
  userName: string;
  jobTitle: string;
  status: string;
  message: string;
  jobUrl: string;
}

export const JobStatusUpdateEmail: React.FC<JobStatusUpdateEmailProps> = ({
  userName,
  jobTitle,
  status,
  message,
  jobUrl,
}) => (
  <EmailLayout>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>Job Status Update</h2>
    <p>Hi {userName},</p>
    <p>The status of your job <strong>{jobTitle}</strong> has been updated to: <strong>{status}</strong></p>
    
    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      <p>{message}</p>
    </div>

    <a
      href={jobUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      View Job Details
    </a>
  </EmailLayout>
);

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  jobTitle: string;
  messagePreview: string;
  conversationUrl: string;
}

export const NewMessageEmail: React.FC<NewMessageEmailProps> = ({
  recipientName,
  senderName,
  jobTitle,
  messagePreview,
  conversationUrl,
}) => (
  <EmailLayout>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>New Message</h2>
    <p>Hi {recipientName},</p>
    <p>
      <strong>{senderName}</strong> sent you a message about: <strong>{jobTitle}</strong>
    </p>
    
    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      <p style={{ fontStyle: 'italic' }}>{messagePreview}</p>
    </div>

    <a
      href={conversationUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      View Conversation
    </a>
  </EmailLayout>
);

interface PaymentConfirmationEmailProps {
  userName: string;
  jobTitle: string;
  amount: string;
  paymentType: 'deposit' | 'final';
  jobUrl: string;
}

export const PaymentConfirmationEmail: React.FC<PaymentConfirmationEmailProps> = ({
  userName,
  jobTitle,
  amount,
  paymentType,
  jobUrl,
}) => (
  <EmailLayout>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>Payment Confirmation</h2>
    <p>Hi {userName},</p>
    <p>
      Your {paymentType} payment of <strong>£{amount}</strong> for <strong>{jobTitle}</strong> has been processed successfully.
    </p>
    
    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Job: {jobTitle}</li>
        <li>Amount: £{amount}</li>
        <li>Type: {paymentType === 'deposit' ? 'Deposit Payment' : 'Final Payment'}</li>
        <li>Date: {new Date().toLocaleDateString('en-GB')}</li>
      </ul>
    </div>

    <a
      href={jobUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      View Job Details
    </a>
  </EmailLayout>
);

interface WelcomeEmailProps {
  userName: string;
  userRole: 'customer' | 'tradesperson';
  dashboardUrl: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  userRole,
  dashboardUrl,
}) => (
  <EmailLayout preheader={`Welcome to Need a Tradesman! Start ${userRole === 'customer' ? 'posting jobs' : 'finding work'} today.`}>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>Welcome to Need a Tradesman!</h2>
    <p>Hi {userName},</p>
    <p>
      Thank you for joining Need a Tradesman as a {userRole}. We&apos;re excited to have you on board!
    </p>
    
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      {userRole === 'customer' ? (
        <>
          <h3 style={{ marginTop: 0, color: '#1a202c' }}>Getting Started:</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Post your first job and describe what you need</li>
            <li>Review applications from skilled tradespeople</li>
            <li>Choose the right tradesperson for your project</li>
            <li>Make secure payments through our platform</li>
          </ul>
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 0, color: '#1a202c' }}>Getting Started:</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Browse available jobs in your area</li>
            <li>Apply to jobs that match your skills</li>
            <li>Connect with customers directly</li>
            <li>Get paid securely through Stripe Connect</li>
          </ul>
        </>
      )}
    </div>

    <a
      href={dashboardUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      Go to Dashboard
    </a>
  </EmailLayout>
);

interface JobResponseEmailProps {
  customerName: string;
  tradespersonName: string;
  jobTitle: string;
  message: string;
  quote?: number;
  jobUrl: string;
}

export const JobResponseEmail: React.FC<JobResponseEmailProps> = ({
  customerName,
  tradespersonName,
  jobTitle,
  message,
  quote,
  jobUrl,
}) => (
  <EmailLayout preheader={`${tradespersonName} has applied for your job: ${jobTitle}`}>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>New Application for Your Job</h2>
    <p>Hi {customerName},</p>
    <p>
      <strong>{tradespersonName}</strong> has applied for your job: <strong>{jobTitle}</strong>
    </p>
    
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', margin: '20px 0', border: '1px solid #e2e8f0' }}>
      <h3 style={{ marginTop: 0, color: '#1a202c', fontSize: '16px' }}>Application Message:</h3>
      <p style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>{message}</p>
      
      {quote && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#ffffff', borderRadius: '4px' }}>
          <strong style={{ color: '#059669' }}>Quoted Price: £{quote.toLocaleString()}</strong>
        </div>
      )}
    </div>

    <a
      href={jobUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      View Application
    </a>
    
    <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
      Respond quickly to show your interest and start a conversation.
    </p>
  </EmailLayout>
);

interface DigestEmailProps {
  firstName: string;
  jobs: Array<{
    id: string;
    title: string;
    category: string;
    location: string;
    budget?: number;
    createdAt: Date;
  }>;
  frequency: 'daily' | 'weekly';
  viewAllUrl: string;
  managePreferencesUrl: string;
  unsubscribeUrl: string;
}

export const DigestEmail: React.FC<DigestEmailProps> = ({
  firstName,
  jobs,
  frequency,
  viewAllUrl,
  managePreferencesUrl,
  unsubscribeUrl,
}) => (
  <EmailLayout preheader={`${jobs.length} new job${jobs.length === 1 ? '' : 's'} matching your preferences`}>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>
      Your {frequency === 'daily' ? 'Daily' : 'Weekly'} Job Digest
    </h2>
    <p>Hi {firstName},</p>
    <p>
      Here {jobs.length === 1 ? 'is' : 'are'} <strong>{jobs.length}</strong> new job{jobs.length === 1 ? '' : 's'} matching your preferences:
    </p>
    
    <div style={{ margin: '20px 0' }}>
      {jobs.map((job, index) => (
        <div 
          key={job.id}
          style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '4px', 
            marginBottom: index < jobs.length - 1 ? '15px' : '0',
            border: '1px solid #e2e8f0'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1a202c', fontSize: '16px' }}>
            {job.title}
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '5px 0' }}>
              <strong>Category:</strong> {job.category}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Location:</strong> {job.location}
            </p>
            {job.budget && (
              <p style={{ margin: '5px 0' }}>
                <strong>Budget:</strong> £{job.budget.toLocaleString()}
              </p>
            )}
            <p style={{ margin: '5px 0', fontSize: '12px' }}>
              Posted {new Date(job.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <a
            href={`${FRONTEND_BASE_URL}/dashboard/jobs/${job.id}`}
            style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            View & Apply
          </a>
        </div>
      ))}
    </div>

    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
      <a
        href={viewAllUrl}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#059669',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          marginRight: '10px',
        }}
      >
        View All Jobs
      </a>
    </div>
    
    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#666' }}>
      <p style={{ margin: '5px 0' }}>
        <a href={managePreferencesUrl} style={{ color: '#3b82f6', textDecoration: 'none' }}>
          Manage your email preferences
        </a> or change digest frequency
      </p>
      <p style={{ margin: '5px 0' }}>
        <a href={unsubscribeUrl} style={{ color: '#666', textDecoration: 'underline' }}>
          Unsubscribe from digests
        </a>
      </p>
    </div>
  </EmailLayout>
);

interface SupportAlertEmailProps {
  entityType: 'job' | 'message' | 'user';
  entityId: string;
  reason: string;
  details: string;
  reportedBy?: string;
  adminUrl: string;
}

export const SupportAlertEmail: React.FC<SupportAlertEmailProps> = ({
  entityType,
  entityId,
  reason,
  details,
  reportedBy,
  adminUrl,
}) => (
  <EmailLayout preheader={`Abuse flag raised on ${entityType} ${entityId}`}>
    <h2 style={{ color: '#dc2626', marginTop: 0 }}>⚠️ Abuse Flag Raised - Immediate Attention Required</h2>
    
    <div style={{ backgroundColor: '#fef2f2', padding: '15px', borderRadius: '4px', margin: '20px 0', border: '2px solid #dc2626' }}>
      <p style={{ margin: '5px 0' }}><strong>Entity Type:</strong> {entityType}</p>
      <p style={{ margin: '5px 0' }}><strong>Entity ID:</strong> <code>{entityId}</code></p>
      <p style={{ margin: '5px 0' }}><strong>Reason:</strong> {reason}</p>
      {reportedBy && (
        <p style={{ margin: '5px 0' }}><strong>Reported By:</strong> {reportedBy}</p>
      )}
    </div>
    
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      <h3 style={{ marginTop: 0, fontSize: '14px', color: '#1a202c' }}>Details:</h3>
      <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{details}</p>
    </div>

    <a
      href={adminUrl}
      style={{
        display: 'inline-block',
        padding: '12px 24px',
        backgroundColor: '#dc2626',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
      }}
    >
      Review in Admin Panel
    </a>
    
    <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
      This is an automated alert from the Need a Tradesman platform.
    </p>
  </EmailLayout>
);
