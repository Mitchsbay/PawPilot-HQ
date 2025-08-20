# PawPilot HQ - The Social Platform for Pet Lovers

A comprehensive social platform built for pet owners to connect, share, and care for their beloved companions.

## 🚀 Quick Start

1. **Clone Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pawpilot-hq.git
   cd pawpilot-hq
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run Database Migration**:
   - Open Supabase Dashboard → SQL Editor
   - Run `ops/sql/0001_consolidated.sql`

5. **Start Development**:
   ```bash
   npm run dev
   ```

## 🐾 Features

### Core Platform Features
- **Pet Profiles**: Create detailed profiles for all your pets
- **Health Tracking**: Monitor veterinary visits, vaccinations, and health records
- **Social Feed**: Share photos, videos, and updates with the pet community
- **Real-time Messaging**: Connect with other pet parents
- **Lost & Found**: Interactive map-based system to report and find lost pets
- **Groups & Events**: Join communities and attend pet-related events
- **Photo Albums & Reels**: Organize and share your pet's memorable moments

### Advanced Features
- **AI Symptom Analyzer**: Get preliminary health insights (requires OpenAI API)
- **Real-time Notifications**: Stay updated with likes, comments, and messages
- **Privacy Controls**: Comprehensive privacy settings for profiles and content
- **Admin Panel**: Complete content moderation and user management system
- **Mobile-First Design**: Responsive design optimized for all devices

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (Authentication, Database, Storage, Real-time, Edge Functions)
- **Mobile**: Capacitor for native mobile features
- **Payments**: Stripe for subscriptions and donations
- **AI**: OpenAI integration for symptom analysis
- **Maps**: Leaflet + OpenStreetMap
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Forms**: React Hook Form + Yup validation
- **Notifications**: React Hot Toast

## 🎮 **Advanced Features**

- **Gamification**: Achievement system with points and levels
- **AI Integration**: Symptom analyzer and auto-tagging
- **Mobile Native**: Camera, GPS, and push notifications
- **Analytics**: Advanced user and platform analytics
- **Feature Flags**: Controlled rollout system
- **Offline Support**: Queue actions when offline

## ?? Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- Vercel account for deployment
- Stripe account for payments (optional)
- OpenAI API key for AI features (optional)

## ⚙️ Environment Setup

1. **Supabase Setup**:
   - Create a new Supabase project
   - **CRITICAL**: Run `ops/sql/0001_consolidated.sql` in Supabase SQL Editor
   - Configure Row Level Security (RLS) policies

2. **Environment Variables**:
   Create a `.env.local` file in your project root:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # Optional - for payments
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   STRIPE_PRICE_ID=price_your-price-id
   ```

3. **Optional - AI Features**:
   For the Symptom Analyzer feature, add:
   ```
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy create-checkout --no-verify-jwt
   supabase functions deploy classify-media --no-verify-jwt
   ```

## 🛠️ Installation & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Run Tests**:
   ```bash
   npm run test
   ```

5. **Check Bucket Names**:
   ```bash
   npm run check-buckets
   ```

## 🗄️ Database Schema

The application includes a comprehensive database schema with:

- **User Management**: Profiles with privacy settings and roles
- **Pet Management**: Pet profiles with health records and photos
- **Social Features**: Posts, comments, likes, follows
- **Messaging**: Real-time messaging with threads
- **Community**: Groups, events, and RSVP management
- **Lost & Found**: Location-based pet reporting system
- **Payments**: Stripe integration for subscriptions
- **Analytics**: Event logging and metrics tracking
- **Gamification**: Achievements and user progress
- **AI**: Media classification and predictions
- **Admin**: Content moderation and user management

## 🔐 Security Features

- Row Level Security (RLS) on all database tables
- Role-based access control (User, Admin, Super Admin)
- Comprehensive privacy settings
- Content moderation system
- Secure file upload with validation
- SQL injection prevention with guards
- Feature flag system for controlled rollouts

## 🌐 Deployment

### Vercel Deployment

1. **Connect Repository**:
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect the React build configuration

2. **Environment Variables**:
   Add the following environment variables in Vercel:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   STRIPE_PRICE_ID=price_your-price-id
   OPENAI_API_KEY=sk-your-openai-key
   ```

3. **Build Settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**:
   - Vercel will automatically build and deploy your application
   - Your app will be available at your Vercel domain

## 📱 Mobile App Setup

### **Capacitor Configuration**

1. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. **Add Platforms**:
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. **Build and Sync**:
   ```bash
   npm run build
   npx cap sync
   ```

4. **Open in IDE**:
   ```bash
   npx cap open ios     # Opens Xcode
   npx cap open android # Opens Android Studio
   ```

## 🎯 **Feature Flags**

Enable features gradually by updating the database:

```sql
-- Enable payments for all users
UPDATE feature_flags SET is_enabled = true WHERE key = 'payments_billing';

-- Enable AI for 50% of users
UPDATE feature_flags SET rollout = '{"pct": 50}' WHERE key = 'ai_autotag';

-- Enable gamification for admin users only
UPDATE feature_flags SET rollout = '{"roles": ["admin", "super_admin"]}' WHERE key = 'gamification_v1';
```

## 📱 Mobile Responsiveness

- Mobile-first design approach
- Responsive breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
- Touch-friendly interface with minimum 44px tap targets
- Optimized navigation for small screens
- Native mobile features (camera, GPS, push notifications)

## 🧪 Testing Checklist

### Authentication Flow
- [x] User can sign up with email/password
- [x] User can sign in with existing credentials
- [x] Password reset functionality works
- [x] Session persistence across page refreshes
- [x] Proper redirect after authentication

### Core Features
- [x] Pet profile creation and management
- [x] Health record tracking
- [x] Photo/video upload to Supabase Storage
- [x] Real-time messaging
- [x] Privacy settings enforcement
- [x] Lost & Found with map functionality

### Admin Features
- [x] Super admin role restrictions
- [x] Content moderation tools
- [x] User management capabilities
- [x] Audit logging

### Advanced Features
- [x] Payment processing with Stripe
- [x] Mobile camera and GPS integration
- [x] AI-powered features
- [x] Analytics and metrics tracking
- [x] Gamification system
- [x] Feature flag system

## 📊 **Analytics & Monitoring**

The application includes comprehensive analytics:

- **User Analytics**: Engagement metrics, growth tracking
- **Platform Metrics**: Daily active users, content creation
- **Health Insights**: Pet health trends and recommendations
- **Performance Monitoring**: Real-time error tracking
- **Business Intelligence**: Revenue and subscription metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔧 **Development Guidelines**

- Use `BUCKETS` constants for all storage operations
- Implement feature flags for new features
- Add telemetry events for user actions
- Follow mobile-first design principles
- Ensure proper error handling and loading states

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please visit the Help & Safety section in the application or contact our support team.

## 🎉 Acknowledgments

- Built with love for pet parents everywhere
- Thanks to the Supabase team for an amazing backend platform
- Icons provided by Lucide React
- Images from Pexels

---

**Made with 🐾 by PawPilot HQ Team**


