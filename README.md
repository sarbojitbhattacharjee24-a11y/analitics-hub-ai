# Website Analytics Platform API

A scalable, production-ready analytics platform for tracking website and mobile app events with comprehensive API endpoints, real-time data aggregation, and beautiful dashboard interface.

## 🚀 Live Demo

**Deployment URL:** https://analitics-hub-ai.lovable.app

## 👤 Author

**Name:** SARBOJIT BHATTACHARJEE

## 📋 Features Implemented

### ✅ API Key Management
- Register websites/apps with Google Authentication
- Generate secure API keys automatically
- Revoke and manage API keys
- Key expiration handling
- Prefix-based key identification

### ✅ Event Data Collection
- High-volume event ingestion with rate limiting (100 req/min)
- Captures clicks, visits, referrer data, device metrics
- IP-based user tracking
- Comprehensive metadata support (browser, OS, screen size)
- SHA-256 API key hashing for security

### ✅ Analytics & Reporting
- Event-based analytics with filtering
- Time-range queries (start/end date)
- App-specific or cross-app analytics
- Unique user tracking
- Device distribution analytics
- Real-time data visualization with charts

### ✅ Additional Features
- Beautiful, responsive dashboard UI
- Google OAuth integration
- PostgreSQL database with optimized indexes
- Row-Level Security (RLS) policies
- Edge Functions (serverless backend)
- Real-time updates
- Comprehensive error handling

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Recharts for data visualization
- React Router for navigation

**Backend:**
- Lovable Cloud (Supabase)
- PostgreSQL with optimized indexes
- Edge Functions (Deno runtime)
- Row-Level Security (RLS)

**Authentication:**
- Google OAuth 2.0
- Email/Password authentication
- JWT-based session management

## 📦 Installation & Setup

### 1️⃣ Clone Repository
```bash
git clone <your-github-repo-url>
cd analytics-platform
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Environment Setup
The project uses Lovable Cloud (managed backend) - no manual environment setup required!

### 4️⃣ Run Development Server
```bash
npm run dev
```

### 5️⃣ Build for Production
```bash
npm run build
```

### 6️⃣ Preview Production Build
```bash
npm run preview
```

## 📚 API Documentation

### Base URL
```
https://entxwqphlytzbcoiqhcn.supabase.co/functions/v1
```

### Authentication
All authenticated endpoints require a Bearer token in the Authorization header.

Public endpoints (like `/analytics-collect`) require an `x-api-key` header.

### Endpoints

#### 1. Register App & Get API Key
```http
POST /auth-register
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "name": "My Website",
  "domain": "https://example.com",
  "description": "Optional description"
}

Response:
{
  "app": {
    "id": "uuid",
    "name": "My Website",
    "domain": "https://example.com"
  },
  "apiKey": "ak_xxxxxxxxxxxxx"
}
```

#### 2. Get API Keys
```http
GET /auth-get-key?app_id=<app_uuid>
Authorization: Bearer <user_jwt_token>

Response:
{
  "apiKeys": [
    {
      "id": "uuid",
      "key_prefix": "ak_xxxxxxxxxx",
      "is_active": true,
      "created_at": "2024-02-20T12:00:00Z"
    }
  ]
}
```

#### 3. Revoke API Key
```http
POST /auth-revoke
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "api_key_id": "uuid"
}
```

#### 4. Collect Analytics Event
```http
POST /analytics-collect
x-api-key: ak_xxxxxxxxxxxxx
Content-Type: application/json

{
  "event": "login_form_cta_click",
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "device": "mobile",
  "ipAddress": "192.168.1.1",
  "timestamp": "2024-02-20T12:34:56Z",
  "metadata": {
    "browser": "Chrome",
    "os": "Android",
    "screenSize": "1080x1920"
  }
}
```

#### 5. Get Event Summary
```http
GET /analytics-event-summary?event=login_form_cta_click&startDate=2024-02-15&endDate=2024-02-20&app_id=uuid
Authorization: Bearer <user_jwt_token>

Response:
{
  "event": "login_form_cta_click",
  "count": 3400,
  "uniqueUsers": 1200,
  "deviceData": {
    "mobile": 2200,
    "desktop": 1200
  }
}
```

#### 6. Get User Stats
```http
GET /analytics-user-stats?userId=192.168.1.1
Authorization: Bearer <user_jwt_token>

Response:
{
  "userId": "192.168.1.1",
  "totalEvents": 150,
  "deviceDetails": {
    "browser": "Chrome",
    "os": "Android"
  },
  "ipAddress": "192.168.1.1"
}
```

## 🏗️ Database Schema

### Tables
- **profiles** - User profile information
- **apps** - Registered applications
- **api_keys** - API key management with hashing
- **analytics_events** - High-volume event storage with indexes

### Security
- Row-Level Security (RLS) enabled on all tables
- Users can only access their own data
- Public insert policy for event collection (validated via API key)

## 🎯 Architecture Highlights

### Scalability
- Optimized PostgreSQL indexes for fast queries
- Edge Functions auto-scale with traffic
- Efficient aggregation queries
- Rate limiting (100 req/min per API key)

### Security
- SHA-256 API key hashing
- RLS policies for data isolation
- Input validation on all endpoints
- Secure authentication flow

### Performance
- Indexed queries on frequently accessed columns
- Efficient device/event aggregation
- Serverless architecture for cost optimization

## 🚧 Challenges & Solutions

1. **High-Volume Event Ingestion**
   - Solution: Optimized indexes on app_id, event, timestamp
   - In-memory rate limiting for API keys

2. **Secure API Key Management**
   - Solution: SHA-256 hashing, prefix-only display
   - Automatic key validation in edge functions

3. **Real-time Analytics Aggregation**
   - Solution: Efficient SQL queries with proper indexes
   - Client-side caching for frequently requested data

4. **Cross-App Analytics**
   - Solution: Flexible query system supporting app-specific or global views
   - Proper RLS policies for data isolation

## 📊 Future Enhancements

- Redis caching for frequently requested analytics
- WebSocket support for real-time event streaming
- Advanced filtering (geolocation, custom dimensions)
- Export functionality (CSV, JSON)
- Webhook notifications for critical events
- Custom dashboard widgets

---

**Built with ❤️ by Sarbojit Bhattacharjee**
