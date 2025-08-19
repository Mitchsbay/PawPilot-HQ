# 🚀 GitHub Setup Guide for PawPilot HQ

## 📋 **Prerequisites**

- GitHub account
- Git installed on your local machine
- Project files downloaded from Bolt

## 🔧 **Step-by-Step Setup**

### **Step 1: Download Project Files**

1. **Download from Bolt**: Use the download button in Bolt to get all project files
2. **Extract**: Unzip the downloaded files to your desired directory
3. **Navigate**: Open terminal/command prompt in the project directory

### **Step 2: Initialize Git Repository**

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: PawPilot HQ - Complete social platform for pet lovers

Features:
- Authentication & user management
- Pet profiles with health tracking
- Real-time messaging and social features
- Interactive maps for lost & found
- Photo albums and pet reels
- Donations platform
- Admin panel with content moderation
- Advanced privacy controls
- Push notifications
- AI symptom analyzer
- Payments integration (Stripe)
- Mobile wrappers (camera, GPS, push)
- Gamification system
- Analytics dashboard"
```

### **Step 3: Create GitHub Repository**

1. **Go to GitHub**: Visit [github.com](https://github.com)
2. **Create Repository**: Click "New" or "+" → "New repository"
3. **Repository Settings**:
   - **Name**: `pawpilot-hq` (or your preferred name)
   - **Description**: `The complete social platform for pet lovers - React, TypeScript, Supabase`
   - **Visibility**: Choose Public or Private
   - **Don't initialize** with README, .gitignore, or license (we already have these)

### **Step 4: Connect Local Repository to GitHub**

```bash
# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/pawpilot-hq.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### **Step 5: Set Up Environment Variables**

Create repository secrets for deployment:

1. **Go to Repository Settings** → Secrets and variables → Actions
2. **Add Repository Secrets**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
   STRIPE_PRICE_ID=price_your-price-id
   OPENAI_API_KEY=sk-your-openai-key (optional)
   ```

### **Step 6: Set Up Deployment**

#### **Option A: Vercel (Recommended)**

1. **Connect Repository**: Go to [vercel.com](https://vercel.com) → Import Project
2. **Select Repository**: Choose your GitHub repository
3. **Configure**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Environment Variables**: Add the same variables from Step 5
5. **Deploy**: Vercel will automatically deploy on every push to main

#### **Option B: Netlify**

1. **Connect Repository**: Go to [netlify.com](https://netlify.com) → New site from Git
2. **Select Repository**: Choose your GitHub repository
3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Environment Variables**: Add variables in Site settings → Environment variables
5. **Deploy**: Automatic deployment on push

### **Step 7: Set Up Supabase**

1. **Database Migration**: Run `ops/sql/0001_consolidated.sql` in Supabase SQL Editor
2. **Deploy Edge Functions**:
   ```bash
   # Install Supabase CLI first: npm install -g supabase
   supabase login
   supabase link --project-ref your-project-ref
   
   # Deploy functions
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy create-checkout --no-verify-jwt
   supabase functions deploy classify-media --no-verify-jwt
   ```
3. **Set Function Environment Variables** in Supabase Dashboard

### **Step 8: Configure CI/CD**

The project includes GitHub Actions workflow for bucket name checking:

```bash
# The workflow will automatically run on:
# - Pull requests to main/develop
# - Pushes to main/develop
# - Checks for legacy bucket names and prevents regressions
```

## 🔒 **Security Checklist**

- [ ] Environment variables set as repository secrets
- [ ] Supabase RLS policies applied
- [ ] Storage bucket policies configured
- [ ] Stripe webhook endpoint configured
- [ ] API keys rotated if needed

## 🚀 **Post-Deployment Steps**

1. **Test Core Features**:
   - User registration and login
   - Pet profile creation
   - File uploads (avatars, pet photos)
   - Real-time messaging
   - Push notifications

2. **Enable Feature Flags**:
   ```sql
   -- In Supabase SQL Editor
   UPDATE feature_flags SET is_enabled = true WHERE key = 'payments_billing';
   UPDATE feature_flags SET is_enabled = true WHERE key = 'gamification_v1';
   -- Enable others as needed
   ```

3. **Monitor Analytics**:
   - Check event_log table for telemetry data
   - Monitor mv_daily_metrics for usage patterns
   - Review error logs in deployment platform

## 📚 **Additional Resources**

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Deployment**: [vercel.com/docs](https://vercel.com/docs)
- **Stripe Integration**: [stripe.com/docs](https://stripe.com/docs)
- **React Router**: [reactrouter.com](https://reactrouter.com)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)

## 🆘 **Troubleshooting**

### **Common Issues**:

1. **Build Errors**: Check environment variables are set correctly
2. **Database Errors**: Ensure migration was run with admin privileges
3. **File Upload Issues**: Verify storage bucket policies are applied
4. **Real-time Issues**: Check Supabase real-time is enabled
5. **Mobile Issues**: Ensure Capacitor is properly configured

### **Getting Help**:

- Check browser console for detailed error messages
- Review Supabase logs in dashboard
- Verify all environment variables are set
- Ensure database migration completed successfully

---

**Your PawPilot HQ project is now ready for GitHub and production deployment! 🐾**