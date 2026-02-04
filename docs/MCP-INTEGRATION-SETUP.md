# MCP Integration Developer Setup Guide

This comprehensive guide provides all the developer API keys, webhooks, and setup documentation needed for integrating additional MCP servers with the RE Engine.

## 📋 Table of Contents

1. [CRM Integration (Supabase Alternative)](#crm-integration)
2. [Email Integration (SpaceEmail + Gmail)](#email-integration)
3. [Property Data Integration (Canadian Market)](#property-data-integration)
4. [Document Management APIs](#document-management-apis)
5. [Calendar & Scheduling APIs](#calendar--scheduling-apis)
6. [Social Media Automation (OpenClaw + APIs)](#social-media-automation)
7. [Voice & Video Integration APIs](#voice--video-integration-apis)
8. [OCR Engine Comparison (PaddleOCR Recommended)](#ocr-engine-comparison)

---

## 🔗 CRM Integration

### Supabase Setup (Recommended over Traditional CRM)

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login and create project
supabase login
supabase projects create
```

#### 2. Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
```

#### 3. MCP Server Tools Needed
- Create/update contacts and leads
- Sync lead data from WhatsApp/email
- Track communication history
- Deal management and pipeline tracking
- Property listing integration

---

### Traditional CRM API Setup (Backup Options)

#### HubSpot Developer Setup

##### 1. Create HubSpot Developer Account
- Go to [HubSpot Developers](https://developers.hubspot.com/)
- Create free developer account
- Create new app in your developer account

##### 2. Required API Keys & Credentials
```bash
# HubSpot Configuration
HUBSPOT_API_KEY="your-hubspot-api-key"
HUBSPOT_CLIENT_ID="your-oauth-client-id"
HUBSPOT_CLIENT_SECRET="your-oauth-client-secret"
HUBSPOT_PORTAL_ID="your-portal-id"
HUBSPOT_APP_ID="your-app-id"
HUBSPOT_WEBHOOK_URL="https://your-domain.com/hubspot-webhook"
```

##### 3. Webhook Setup
```bash
# Webhook Events to Subscribe:
# - contact.creation
# - contact.propertyChange
# - deal.creation
# - deal.propertyChange
# - company.creation
# - company.propertyChange
```

##### 4. OAuth Scopes Required
```bash
# Required OAuth Scopes:
# - crm.objects.contacts.write
# - crm.objects.deals.write
# - crm.objects.companies.write
# - crm.schemas.deals.read
# - crm.schemas.contacts.read
# - tickets
# - marketing
# - sales
```

#### Salesforce Developer Setup

##### 1. Create Salesforce Developer Account
- Go to [Salesforce Developers](https://developer.salesforce.com/)
- Sign up for free Developer Edition
- Create Connected App

##### 2. Required API Keys & Credentials
```bash
# Salesforce Configuration
SF_CONSUMER_KEY="your-consumer-key"
SF_CONSUMER_SECRET="your-consumer-secret"
SF_USERNAME="your-salesforce-username"
SF_PASSWORD="your-salesforce-password"
SF_SECURITY_TOKEN="your-security-token"
SF_INSTANCE_URL="https://your-instance.my.salesforce.com"
SF_WEBHOOK_URL="https://your-domain.com/salesforce-webhook"
```

##### 3. OAuth Scopes Required
```bash
# Required OAuth Scopes:
# - api
# - refresh_token
# - full
```

---

## 📧 Email Integration

### SpaceEmail Setup (Primary)

#### 1. SpaceEmail Account Setup
- Go to [SpaceEmail](https://www.spacemail.com/)
- Create business email account
- Note the QR code authentication process

#### 2. IMAP/SMTP Configuration
```bash
# SpaceEmail Configuration
SPACEMAIL_USER="your-email@spacemail.com"
SPACEMAIL_PASS="your-password"
SPACEMAIL_IMAP_HOST="mail.spacemail.com"
SPACEMAIL_IMAP_PORT="993"
SPACEMAIL_SMTP_HOST="mail.spacemail.com"
SPACEMAIL_SMTP_PORT="465"
SPACEMAIL_USE_TLS="true"
```

#### 3. QR Code Authentication Process
```bash
# QR Code Authentication Flow:
# 1. Login with email/password
# 2. QR code displays on computer
# 3. Scan with mobile phone authenticator app
# 4. Phone authorizes the session
# 5. Computer gains access to email
```

### Gmail API Setup (Backup/Enhancement)

#### 1. Google Cloud Project Setup
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create new project or use existing: `creditx-478204`
- Enable Gmail API

#### 2. Create OAuth 2.0 Credentials
```bash
# Gmail API Configuration
GMAIL_CLIENT_ID="your-oauth-client-id"
GMAIL_CLIENT_SECRET="your-oauth-client-secret"
GMAIL_REDIRECT_URI="https://your-domain.com/gmail-callback"
GMAIL_WEBHOOK_URL="https://your-domain.com/gmail-webhook"
```

#### 3. Required OAuth Scopes
```bash
# Gmail API Scopes:
# - https://www.googleapis.com/auth/gmail.readonly
# - https://www.googleapis.com/auth/gmail.send
# - https://www.googleapis.com/auth/gmail.modify
# - https://www.googleapis.com/auth/gmail.compose
```

#### 4. Service Account Alternative
```bash
# Service Account Configuration
GMAIL_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GMAIL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## 🏠 Property Data Integration

### Canadian Market Integration

#### 1. REALTOR.ca DDF® (Data Distribution Facility)
```bash
# REALTOR.ca DDF Configuration
REALTOR_DDF_USERNAME="your-ddf-username"
REALTOR_DDF_PASSWORD="your-ddf-password"
REALTOR_DDF_CUSTOMER_ID="your-customer-id"
REALTOR_DDF_REALTOR_ID="your-realtor-id"
```

##### DDF API Documentation
- **Official Documentation**: [REALTOR.ca DDF® Guide](https://repliers.com/a-guide-to-mls-apis-in-canada/)
- **API Endpoint**: `https://api.realtor.ca`
- **Authentication**: Basic Auth with DDF credentials
- **Rate Limit**: 1000 requests per hour

#### 2. MLS IDX API (Canada & US)
```bash
# MLS IDX API Configuration
MLS_IDX_API_KEY="your-mls-idx-api-key"
MLS_IDX_API_SECRET="your-mls-idx-secret"
MLS_IDX_API_URL="https://api.mlsidxapi.com"
MLS_IDX_WEBHOOK_URL="https://your-domain.com/mls-webhook"
```

#### 3. Zillow Group APIs (US Market)
```bash
# Zillow Configuration
ZILLOW_API_KEY="your-zillow-api-key"
ZILLOW_WEBHOOK_URL="https://your-domain.com/zillow-webhook"
ZILLOW_BRIDGE_API_KEY="your-bridge-api-key"
```

##### Zillow APIs Available:
- **Zillow GetDeepSearchResults**: Property search
- **Zillow GetUpdatedPropertyDetails**: Property details
- **Zillow GetZestimate**: Property valuation
- **Zillow GetDemographics**: Area demographics

#### 4. Alternative Property APIs
```bash
# Alternative Property Data Sources
REALTOR_API_KEY="your-realtor-com-api-key"
RIGHTMOVE_API_KEY="your-rightmove-api-key"
ESTATED_API_KEY="your-estated-api-key"
ATTOM_API_KEY="your-attom-data-api-key"
```

---

## 📁 Document Management APIs

### Google Drive API Setup

#### 1. Google Cloud Project Setup
```bash
# Google Drive Configuration
GOOGLE_DRIVE_CLIENT_ID="your-oauth-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-oauth-client-secret"
GOOGLE_DRIVE_REDIRECT_URI="https://your-domain.com/drive-callback"
GOOGLE_DRIVE_WEBHOOK_URL="https://your-domain.com/drive-webhook"
```

#### 2. Required OAuth Scopes
```bash
# Google Drive Scopes:
# - https://www.googleapis.com/auth/drive
# - https://www.googleapis.com/auth/drive.file
# - https://www.googleapis.com/auth/drive.metadata
```

#### 3. Service Account Alternative
```bash
# Service Account for Drive
GOOGLE_DRIVE_SERVICE_ACCOUNT="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Dropbox API Setup

#### 1. Dropbox App Creation
- Go to [Dropbox Developers](https://www.dropbox.com/developers)
- Create new app
- Select "Full Dropbox" access
- Generate access token

#### 2. Required API Keys
```bash
# Dropbox Configuration
DROPBOX_APP_KEY="your-dropbox-app-key"
DROPBOX_APP_SECRET="your-dropbox-app-secret"
DROPBOX_ACCESS_TOKEN="your-dropbox-access-token"
DROPBOX_REFRESH_TOKEN="your-dropbox-refresh-token"
DROPBOX_WEBHOOK_URL="https://your-domain.com/dropbox-webhook"
```

#### 3. Webhook Verification
```bash
# Dropbox Webhook Headers
X-Dropbox-Signature: "HMAC-SHA256 signature"
X-Dropbox-Request-UUID: "unique-request-id"
```

### DocuSign API Setup

#### 1. DocuSign Developer Account
- Go to [DocuSign Developers](https://developers.docusign.com/)
- Create developer account
- Create new integration

#### 2. Required API Keys
```bash
# DocuSign Configuration
DOCUSIGN_CLIENT_ID="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"
DOCUSIGN_RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_URL="https://demo.docusign.net"  # or https://www.docusign.net for production
DOCUSIGN_WEBHOOK_URL="https://your-domain.com/docusign-webhook"
```

#### 3. OAuth Scopes Required
```bash
# DocuSign Scopes:
# - signature
# - impersonation
```

---

## 📅 Calendar & Scheduling APIs

### Google Calendar API Setup

#### 1. Google Cloud Project Setup
```bash
# Google Calendar Configuration
GOOGLE_CALENDAR_CLIENT_ID="your-oauth-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="your-oauth-client-secret"
GOOGLE_CALENDAR_REDIRECT_URI="https://your-domain.com/calendar-callback"
GOOGLE_CALENDAR_WEBHOOK_URL="https://your-domain.com/calendar-webhook"
```

#### 2. Required OAuth Scopes
```bash
# Google Calendar Scopes:
# - https://www.googleapis.com/auth/calendar
# - https://www.googleapis.com/auth/calendar.events
# - https://www.googleapis.com/auth/calendar.readonly
```

#### 3. Webhook Setup
```bash
# Calendar Webhook Events
# - Event created
# - Event updated
# - Event deleted
# - Event responded
```

### Calendly API Setup

#### 1. Calendly Developer Account
- Go to [Calendly Developers](https://developer.calendly.com/)
- Create developer account
- Generate personal access token

#### 2. Required API Keys
```bash
# Calendly Configuration
CALENDLY_API_KEY="your-personal-access-token"
CALENDLY_WEBHOOK_URL="https://your-domain.com/calendly-webhook"
CALENDLY_OAUTH_CLIENT_ID="your-oauth-client-id"
CALENDLY_OAUTH_CLIENT_SECRET="your-oauth-client-secret"
```

#### 3. Webhook Subscriptions
```bash
# Calendly Webhook Events:
# - invitee.created
# - invitee.canceled
# - routing_form_submission
```

---

## 📱 Social Media Automation

### OpenClaw Integration (Primary - No API Required)

#### 1. OpenClaw Setup
```bash
# Install OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

#### 2. Social Media Automation with OpenClaw
```bash
# OpenClaw can automate social media without APIs:
# - LinkedIn: Browser automation with Playwright
# - Instagram: Mobile app automation
# - Facebook: Web interface automation
# - Twitter/X: Web interface automation
# - TikTok: Mobile app automation
```

#### 3. OpenClaw + LLAMA Integration
```bash
# Use LLAMA models for content generation
# OpenClaw handles the posting automation
# No API keys required for basic posting
```

### Traditional Social Media APIs (Backup)

#### Twitter API v2 Setup
```bash
# Twitter Configuration
TWITTER_BEARER_TOKEN="your-twitter-bearer-token"
TWITTER_API_KEY="your-api-key"
TWITTER_API_SECRET="your-api-secret"
TWITTER_ACCESS_TOKEN="your-access-token"
TWITTER_ACCESS_TOKEN_SECRET="your-access-token-secret"
TWITTER_WEBHOOK_URL="https://your-domain.com/twitter-webhook"
```

#### Instagram Basic Display API
```bash
# Instagram Configuration
INSTAGRAM_APP_ID="your-instagram-app-id"
INSTAGRAM_APP_SECRET="your-instagram-app-secret"
INSTAGRAM_ACCESS_TOKEN="your-instagram-access-token"
INSTAGRAM_WEBHOOK_URL="https://your-domain.com/instagram-webhook"
```

#### LinkedIn Marketing API
```bash
# LinkedIn Configuration
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_ACCESS_TOKEN="your-linkedin-access-token"
LINKEDIN_WEBHOOK_URL="https://your-domain.com/linkedin-webhook"
```

---

## 🎙️ Voice & Video Integration APIs

### Twilio API Setup

#### 1. Twilio Account Setup
- Go to [Twilio Console](https://www.twilio.com/console)
- Create account
- Get phone number

#### 2. Required API Keys
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_WEBHOOK_URL="https://your-domain.com/twilio-webhook"
```

#### 3. Optional API Key (More Secure)
```bash
# Twilio API Key (Alternative to Auth Token)
TWILIO_API_KEY="your-api-key"
TWILIO_API_SECRET="your-api-key-secret"
```

#### 4. Voice & SMS Capabilities
```bash
# Twilio Services:
# - Voice calls
# - SMS/MMS messages
# - WhatsApp (already have via Whapi.Cloud)
# - Video calls (via Twilio Video)
```

### Zoom API Setup

#### 1. Zoom Developer Account
- Go to [Zoom Developers](https://developers.zoom.us/)
- Create server-to-server OAuth app
- Or create JWT app

#### 2. Required API Keys
```bash
# Zoom Configuration
ZOOM_API_KEY="your-zoom-api-key"
ZOOM_API_SECRET="your-zoom-api-secret"
ZOOM_WEBHOOK_SECRET="your-webhook-secret-token"
ZOOM_WEBHOOK_URL="https://your-domain.com/zoom-webhook"
ZOOM_VERIFICATION_TOKEN="your-verification-token"
```

#### 3. OAuth Alternative
```bash
# Zoom OAuth Configuration
ZOOM_CLIENT_ID="your-oauth-client-id"
ZOOM_CLIENT_SECRET="your-oauth-client-secret"
ZOOM_REDIRECT_URI="https://your-domain.com/zoom-callback"
```

#### 4. JWT Token Generation
```bash
# JWT Payload for Zoom
{
  "iss": "your-api-key",
  "exp": 1500000000
}
```

---

## 🔍 OCR Engine Comparison

### PaddleOCR (Recommended - Most Advanced)

#### 1. PaddleOCR Setup
```bash
# Install PaddleOCR
pip install paddlepaddle paddleocr

# Python Integration
from paddleocr import PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en')
```

#### 2. Performance Characteristics
- **Speed**: Fastest among open-source OCR engines
- **Accuracy**: 95%+ on standard documents
- **Languages**: 80+ languages supported
- **Models**: Lightweight and accurate models
- **Deployment**: Easy deployment on CPU/GPU

#### 3. API Integration
```bash
# PaddleOCR API Configuration
PADDLEOCR_API_URL="http://localhost:8866/predict/ocr_system"
PADDLEOCR_MODEL_PATH="/path/to/models"
```

### EasyOCR (Alternative)

#### 1. EasyOCR Setup
```bash
# Install EasyOCR
pip install easyocr

# Python Integration
import easyocr
reader = easyocr.Reader(['en', 'fr'])  # Multi-language support
```

#### 2. Performance Characteristics
- **Speed**: Moderate
- **Accuracy**: 90%+ on clean text
- **Languages**: 80+ languages
- **Ease of Use**: Very simple API

### Tesseract OCR (Legacy)

#### 1. Tesseract Setup
```bash
# Install Tesseract
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Ubuntu

# Python Integration
import pytesseract
from PIL import Image
```

#### 2. Performance Characteristics
- **Speed**: Slowest
- **Accuracy**: 85% on clean text
- **Languages**: 100+ languages
- **Maturity**: Most mature OCR engine

### OCR Recommendation for Real Estate

#### **Primary Choice: PaddleOCR**
```bash
# Reasons:
# 1. Fastest processing for property documents
# 2. High accuracy on contracts and legal documents
# 3. Multi-language support for international properties
# 4. Easy deployment with Docker
# 5. Active development and updates
```

#### **Secondary Choice: EasyOCR**
```bash
# Use when:
# 1. Simpler setup needed
# 2. Less critical accuracy requirements
# 3. Quick prototyping
```

---

## 🚀 Implementation Priority

### **Phase 1** (Immediate - Core Business Logic)
1. **Supabase Integration** - Replace traditional CRM
2. **SpaceEmail + Gmail API** - Email automation
3. **Canadian Property Data** - REALTOR.ca DDF®
4. **PaddleOCR Integration** - Document processing

### **Phase 2** (Next Quarter - Enhanced Automation)
5. **Google Drive API** - Document storage
6. **Google Calendar API** - Scheduling
7. **OpenClaw Social Media** - Marketing automation
8. **DocuSign API** - E-signature integration

### **Phase 3** (Future - Advanced Features)
9. **Twilio API** - Voice/SMS enhancement
10. **Zoom API** - Video meetings
11. **Dropbox API** - Alternative storage
12. **Calendly API** - Advanced scheduling

---

## 📝 Environment Variables Template

```bash
# =============================================================================
# MCP INTEGRATION ENVIRONMENT VARIABLES
# =============================================================================

# CRM Integration (Supabase)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Email Integration
SPACEMAIL_USER="your-email@spacemail.com"
SPACEMAIL_PASS="your-password"
SPACEMAIL_IMAP_HOST="mail.spacemail.com"
SPACEMAIL_SMTP_HOST="mail.spacemail.com"

GMAIL_CLIENT_ID="your-oauth-client-id"
GMAIL_CLIENT_SECRET="your-oauth-client-secret"

# Property Data (Canadian Market)
REALTOR_DDF_USERNAME="your-ddf-username"
REALTOR_DDF_PASSWORD="your-ddf-password"
MLS_IDX_API_KEY="your-mls-idx-api-key"

# Document Management
GOOGLE_DRIVE_CLIENT_ID="your-oauth-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-oauth-client-secret"

DROPBOX_APP_KEY="your-dropbox-app-key"
DROPBOX_ACCESS_TOKEN="your-dropbox-access-token"

DOCUSIGN_CLIENT_ID="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"

# Calendar & Scheduling
GOOGLE_CALENDAR_CLIENT_ID="your-oauth-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="your-oauth-client-secret"

CALENDLY_API_KEY="your-personal-access-token"

# Voice & Video
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"

ZOOM_API_KEY="your-zoom-api-key"
ZOOM_API_SECRET="your-zoom-api-secret"

# OCR Engine
PADDLEOCR_API_URL="http://localhost:8866/predict/ocr_system"
```

---

## 📚 Additional Resources

### Developer Portals
- [HubSpot Developers](https://developers.hubspot.com/)
- [Salesforce Developers](https://developer.salesforce.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Dropbox Developers](https://www.dropbox.com/developers)
- [DocuSign Developers](https://developers.docusign.com/)
- [Twilio Docs](https://www.twilio.com/docs)
- [Zoom Developers](https://developers.zoom.us/)
- [Calendly Developers](https://developer.calendly.com/)

### API Documentation
- [REALTOR.ca DDF® Guide](https://repliers.com/a-guide-to-mls-apis-in-canada/)
- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [OpenClaw Documentation](https://openclaw.ai/)

### Testing & Development
- Use sandbox environments for all APIs
- Implement proper error handling and rate limiting
- Set up webhooks for real-time data synchronization
- Test authentication flows thoroughly
- Monitor API usage and costs

---

This comprehensive setup guide provides all the necessary developer credentials, API keys, and webhook configurations needed to integrate the RE Engine with a complete real estate automation ecosystem.
