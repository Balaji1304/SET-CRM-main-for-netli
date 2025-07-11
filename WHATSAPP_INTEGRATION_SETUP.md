# WhatsApp Cloud API Integration Setup Guide

## Overview

This CRM now supports sending notifications via both **Email** and **WhatsApp** using Meta's official WhatsApp Cloud API. The system automatically determines which communication channels to use based on customer data availability and preferences.

## Features

- ✅ **Dual-channel communication**: Email and/or WhatsApp
- ✅ **Flexible contact requirements**: Either email OR WhatsApp (or both)
- ✅ **Template messages**: Pre-approved templates for quotations, invoices, and welcome messages
- ✅ **Document sharing**: Send PDFs via WhatsApp
- ✅ **Automatic fallback**: Uses available contact method if one fails
- ✅ **Existing workflow preservation**: All existing email flows continue to work

## Prerequisites

1. **Meta Business Account** (https://business.facebook.com)
2. **WhatsApp Business Account** (WABA)
3. **Verified Meta Business Manager**
4. **Phone number** for WhatsApp Business

## Step-by-Step Setup

### 1. Create WhatsApp Business App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app → **Business** → **WhatsApp**
3. Add your app name and select your Business Account
4. Go to **WhatsApp** → **Getting Started**

### 2. Get Required Credentials

#### A. Access Token (Permanent)
1. In your WhatsApp Business app, go to **WhatsApp** → **Getting Started**
2. Copy the **temporary access token** 
3. Generate a **System User** permanent token:
   - Go to Business Settings → System Users
   - Create new system user
   - Add to your app with **WhatsApp Business Management** permission
   - Generate access token with `whatsapp_business_messaging` scope

#### B. Phone Number ID
1. In WhatsApp Getting Started, find **Phone number ID**
2. Copy the ID (looks like: `151234567890123`)

#### C. WABA ID (Optional)
1. In Business Settings → WhatsApp Business Accounts
2. Copy your WABA ID

### 3. Environment Variables

Add these variables to your backend `.env` file:

```env
# WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_from_meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_from_meta
WABA_ID=your_whatsapp_business_account_id

# Frontend URL (for links in messages)
FRONTEND_URL=https://your-crm-domain.com
```

### 4. Message Templates

Create and submit these templates for approval in Meta Business Manager:

#### Template 1: `quotation_ready`
**Category**: UTILITY  
**Language**: English  
**Template**:
```
Hi {{1}}, your quotation for {{2}} is ready. Please check here: {{3}}
```

#### Template 2: `invoice_generated`
**Category**: UTILITY  
**Language**: English  
**Template**:
```
Hi {{1}}, your invoice {{2}} for ₹{{3}} is ready. View here: {{4}}
```

#### Template 3: `welcome_credentials`
**Category**: UTILITY  
**Language**: English  
**Template**:
```
Welcome {{1}}! Your CRM account is ready.
Email: {{2}}
Password: {{3}}
Login: {{4}}
```

### 5. Template Approval Process

1. Go to **WhatsApp Manager** → **Message Templates**
2. Create each template with exact text above
3. Submit for review (usually takes 24-48 hours)
4. Templates must be **APPROVED** before use

### 6. Test Configuration

After setup, test your integration:

```bash
# API endpoint to test configuration
GET /api/whatsapp/test-config
Authorization: Bearer your_jwt_token
```

Or check status:
```bash
GET /api/whatsapp/status
```

## How It Works

### Customer Contact Flow

1. **Lead Creation**: Either email OR WhatsApp number required (or both)
2. **Preference Detection**: System auto-detects preferred contact method
3. **Notification Sending**: Uses available channels based on data

### Notification Logic

```javascript
// Automatic channel selection
if (customer.email && customer.whatsapp) {
  // Send to both channels
  sendNotification({ preferences: ['email', 'whatsapp'] })
} else if (customer.email) {
  // Email only
  sendNotification({ preferences: ['email'] })
} else if (customer.whatsapp) {
  // WhatsApp only
  sendNotification({ preferences: ['whatsapp'] })
}
```

### Message Types

1. **Template Messages**: For structured notifications (quotations, invoices)
2. **Document Messages**: For sending PDFs
3. **Text Messages**: For simple notifications (fallback)

## Customer Model Updates

### New Fields Added:
- `whatsapp`: WhatsApp number (optional)
- `countryCode`: Country code (default: +91)
- `preferredContactMethod`: 'email', 'whatsapp', or 'both'

### Validation:
- At least one contact method (email OR whatsapp) required
- Email unique constraint maintained
- Auto-preference detection

## Database Migration

For existing customers, run this migration:

```javascript
// Update existing customers to have preferredContactMethod
db.customers.updateMany(
  { preferredContactMethod: { $exists: false } },
  { $set: { preferredContactMethod: 'email' } }
);

db.leads.updateMany(
  { preferredContactMethod: { $exists: false } },
  { $set: { preferredContactMethod: 'email' } }
);
```

## Error Handling

- **Template not approved**: Falls back to text message
- **Invalid phone number**: Skips WhatsApp, uses email
- **API rate limits**: Automatic retry with exponential backoff
- **Network failures**: Graceful fallback to available channel

## Security Best Practices

1. **Environment Variables**: Never commit tokens to version control
2. **Token Security**: Use permanent tokens, rotate regularly
3. **Phone Validation**: Format and validate numbers before sending
4. **Rate Limiting**: Built-in respect for WhatsApp API limits
5. **Error Logging**: Monitor failed messages for debugging

## Troubleshooting

### Common Issues:

#### 1. "Template not found"
- **Cause**: Template not approved or wrong name
- **Solution**: Check template status in WhatsApp Manager

#### 2. "Invalid phone number"
- **Cause**: Incorrect format or country code
- **Solution**: Ensure format like "91XXXXXXXXXX" (no +)

#### 3. "Authentication failed"
- **Cause**: Invalid or expired access token
- **Solution**: Generate new permanent token

#### 4. "Phone number not registered"
- **Cause**: Phone number not added to your WABA
- **Solution**: Add number in WhatsApp Manager

### Debug API Calls:

```bash
# Test with curl
curl -X POST \
  https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "91XXXXXXXXXX",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

## Production Checklist

- [ ] Permanent access token generated
- [ ] All templates approved
- [ ] Environment variables configured
- [ ] Phone number verified
- [ ] Test messages sent successfully
- [ ] Error monitoring setup
- [ ] Backup email system verified

## Support

For WhatsApp Cloud API issues:
- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Support](https://business.facebook.com/help)

For CRM integration issues:
- Check server logs
- Test with `/api/whatsapp/test-config` endpoint
- Verify customer data has at least one contact method 