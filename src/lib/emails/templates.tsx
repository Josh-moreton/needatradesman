import * as React from 'react';

// Email templates using React components
// Resend supports React components for email rendering

interface EmailLayoutProps {
  children: React.ReactNode;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({ children }) => (
  <html lang="en">
    <body style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#333' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          {children}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <p>Need a Tradesman - Connecting customers with skilled tradespeople</p>
          <p>&copy; {new Date().getFullYear()} Need a Tradesman. All rights reserved.</p>
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
  <EmailLayout>
    <h2 style={{ color: '#1a202c', marginTop: 0 }}>Welcome to Need a Tradesman!</h2>
    <p>Hi {userName},</p>
    <p>
      Thank you for joining Need a Tradesman as a {userRole}. We&apos;re excited to have you on board!
    </p>
    
    <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
      {userRole === 'customer' ? (
        <>
          <h3 style={{ marginTop: 0, color: '#1a202c' }}>Getting Started:</h3>
          <ul>
            <li>Post your first job and describe what you need</li>
            <li>Review applications from skilled tradespeople</li>
            <li>Choose the right tradesperson for your project</li>
            <li>Make secure payments through our platform</li>
          </ul>
        </>
      ) : (
        <>
          <h3 style={{ marginTop: 0, color: '#1a202c' }}>Getting Started:</h3>
          <ul>
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
