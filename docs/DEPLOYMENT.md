## 🚀 PawPilot HQ Deployment Guide

### Prerequisites

1. **Supabase Project Setup**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key from Settings > API

2. **Database Migration**
   - **CRITICAL**: Storage policies must be applied via Supabase Dashboard SQL Editor
   - Do NOT run storage policy migrations via the app (will fail with 42501 error)

### Step 1: Database Setup

1. **Apply Main Schema Migration**
   ```bash
   # In your Supabase project, go to SQL Editor and run:
   # All migration files in supabase/migrations/ folder
   ```

2. **Apply Storage Policies (ADMIN REQUIRED)**
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `supabase/migrations/20250819_storage_policies_idempotent.sql`
   - **CRITICAL**: This MUST be run in SQL Editor (admin privileges required)
   - Run the migration (requires admin privileges)
   - Verify with: 
   ```sql
   select polname, cmd, qual, with_check
   from pg_policies
   where schemaname='storage' and tablename='objects'
   order by polname;
   ```

### Step 2: Environment Variables

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Optional: AI Features
OPENAI_API_KEY=your-openai-api-key
```

### Step 3: Deploy to Vercel

1. **Connect Repository**
   - Connect your GitHub repository to Vercel
   - Vercel will auto-detect React/Vite configuration

2. **Environment Variables**
   Add in Vercel Dashboard:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Build Settings**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Step 4: Verify Deployment

1. **Test Core Features**
   - User registration and login
   - Pet profile creation
   - File uploads (avatar, pet photos)
   - Real-time messaging
   - Push notifications

2. **Test Security**
   - File upload permissions
   - Privacy settings
   - User blocking/reporting

### Troubleshooting

**Storage Policy Errors (42501)**
- Must run storage migrations in Supabase Dashboard SQL Editor
- Cannot be applied via app or edge functions (insufficient privileges)

**File Upload Failures**
- Check storage bucket policies are applied
- Verify environment variables are set
- Ensure path-based ownership is enforced

**Real-time Features Not Working**
- Verify Supabase real-time is enabled
- Check WebSocket connections in browser dev tools
- Ensure proper channel subscriptions

### Production Checklist

- [ ] Database migrations applied via SQL Editor
- [ ] Storage buckets and policies created
- [ ] Environment variables configured
- [ ] File uploads working
- [ ] Real-time features functional
- [ ] Push notifications enabled
- [ ] Email notifications configured
- [ ] Admin panel accessible
- [ ] Privacy controls working
- [ ] Performance optimized