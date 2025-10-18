# Crisp.chat Integration

## Overview

This project uses [Crisp.chat](https://crisp.chat/) for customer support and live chat functionality. Crisp provides a complete support platform with live chat, email, and knowledge base features.

## Features

- **Live Chat Widget**: Embedded chat widget on all pages
- **User Context**: Automatically identifies logged-in users with their email and name
- **Multi-Channel Support**: Email, live chat, and more from a single inbox
- **Mobile Apps**: Crisp provides iOS and Android apps for support team
- **Automated Responses**: Set up chatbots and automated replies
- **Team Collaboration**: Multiple support agents can work together
- **Analytics**: Track response times, customer satisfaction, and more

## Setup

### 1. Create Crisp Account

1. Go to [crisp.chat](https://crisp.chat/)
2. Sign up for a free account (free for unlimited users)
3. Create a new website in your Crisp dashboard

### 2. Get Website ID

1. In your Crisp dashboard, go to Settings > Setup > Website Settings
2. Copy your Website ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_CRISP_WEBSITE_ID=your-website-id-here
```

⚠️ **Important**: This must be a `NEXT_PUBLIC_` variable because it's used in client components.

### 4. Deploy

When deploying to production, make sure to set the `NEXT_PUBLIC_CRISP_WEBSITE_ID` environment variable in your hosting platform (Vercel, etc.).

## How It Works

### Client-Side Integration

The `CrispChat` component (`src/components/support/CrispChat.tsx`) is added to the root layout and:

1. Loads the Crisp SDK when the page loads
2. Configures Crisp with your Website ID
3. If user is logged in (via Clerk):
   - Sets user email
   - Sets user name
   - Passes Clerk user ID for tracking

### Support Page

The support landing page (`src/app/(protected)/support/page.tsx`) provides:

- Button to open live chat
- Link to email support
- FAQ section with common questions
- Instructions for getting help

## User Experience

### For Customers/Tradespeople

1. **Live Chat Widget**: A small chat bubble appears in the bottom-right corner of every page
2. **Click to Chat**: Click the bubble to start a conversation
3. **Automatic Context**: If logged in, Crisp automatically knows their email and name
4. **Multi-Device**: Conversations sync across devices
5. **Email Notifications**: Users get email notifications for new messages

### For Support Team

1. **Crisp Dashboard**: Access all conversations from [app.crisp.chat](https://app.crisp.chat)
2. **Mobile Apps**: Respond from iOS/Android apps
3. **Team Inbox**: All team members see incoming conversations
4. **Customer Context**: See user's email, name, and Clerk ID
5. **Rich Features**: Send images, files, gifs, and more

## Features vs Custom Implementation

Crisp.chat provides many features that would take significant time to build:

| Feature | Crisp.chat | Custom Build |
|---------|-----------|--------------|
| Live Chat | ✅ Built-in | ❌ Complex (WebSockets, state management) |
| Mobile Apps | ✅ iOS & Android | ❌ Would need to build |
| Email Support | ✅ Unified inbox | ❌ Separate system |
| Chatbots | ✅ Visual builder | ❌ Custom AI integration |
| File Sharing | ✅ Built-in | ❌ S3 setup required |
| Team Collaboration | ✅ Built-in | ❌ Complex permissions |
| Analytics | ✅ Built-in dashboard | ❌ Custom analytics |
| Multi-language | ✅ 90+ languages | ❌ Custom i18n |
| Knowledge Base | ✅ Built-in | ❌ Separate system |
| Video Chat | ✅ Built-in | ❌ Complex integration |

## Pricing

- **Free**: Unlimited conversations, 2 team members
- **Pro**: $25/month per team member - Advanced features
- **Unlimited**: $95/month per team member - All features

Most startups start with the free plan and upgrade as needed.

## Customization

### Widget Appearance

Customize the chat widget appearance in your Crisp dashboard:
- Colors and branding
- Widget position
- Welcome message
- Availability status

### Chatbot Setup

1. Go to Crisp dashboard > Chatbots
2. Create scenarios for common questions
3. Set up automatic responses
4. Add conditions based on user data

### Integrations

Crisp integrates with:
- Slack (get notified in Slack)
- Zapier (connect to 1000+ apps)
- Stripe (see customer payment info)
- Google Analytics
- And many more...

## Advanced Usage

### Opening Chat Programmatically

The support page includes a button that opens the chat widget:

```typescript
import { Crisp } from "crisp-sdk-web";

const openChat = () => {
  Crisp.chat.open();
};
```

### Setting Custom Data

You can set additional user data:

```typescript
Crisp.session.setData({
  user_role: "customer", // or "tradesperson"
  plan: "premium",
  // any custom data
});
```

### Listening to Events

```typescript
Crisp.message.onMessageReceived((message) => {
  console.log("New message:", message);
});
```

## Security & Privacy

- ✅ **GDPR Compliant**: Crisp is GDPR compliant
- ✅ **Data Encryption**: All data is encrypted
- ✅ **Privacy Controls**: Users can export/delete their data
- ✅ **SOC 2 Type II**: Enterprise-grade security

## Support

If you need help with Crisp:
- Crisp Documentation: https://docs.crisp.chat/
- Crisp Support: Use the chat on their website!
- API Reference: https://docs.crisp.chat/api/v1/

## Migration from Custom System

If you previously had a custom ticketing system:

1. **Data Export**: Export existing tickets/conversations if needed
2. **Import**: Use Crisp API to import historical conversations (optional)
3. **Notify Users**: Let users know about the new support system
4. **Train Team**: Train support team on Crisp dashboard

## Testing

To test the integration:

1. Set `NEXT_PUBLIC_CRISP_WEBSITE_ID` in `.env.local`
2. Run `pnpm dev`
3. Navigate to `/support` or any page
4. Click the chat bubble in bottom-right corner
5. Send a test message
6. Check your Crisp dashboard at app.crisp.chat

## Troubleshooting

**Chat widget not appearing?**
- Check that `NEXT_PUBLIC_CRISP_WEBSITE_ID` is set correctly
- Check browser console for errors
- Verify the Website ID in Crisp dashboard

**User info not showing?**
- User must be logged in via Clerk
- Check that Clerk is properly configured
- Verify the CrispChat component is receiving user data

**Widget in wrong position?**
- Customize position in Crisp dashboard > Appearance > Widget Position
