# 🚀 PawPilot HQ Deployment Checklist

## 📋 **Pre-Deployment Requirements**

### **1. GitHub Repository Setup**
- [ ] Repository created on GitHub
- [ ] Local git repository initialized
- [ ] All files committed and pushed to main branch
- [ ] Repository secrets configured with environment variables

### **2. Supabase Configuration**
- [ ] Supabase project created
- [ ] Database migration `ops/sql/0001_consolidated.sql` executed
- [ ] Storage bucket policies applied
- [ ] Edge functions deployed
- [ ] Environment variables set in Supabase dashboard

### **3. External Services**
- [ ] Stripe account configured (if using payments)
- [ ] OpenAI API key obtained (if using AI features)
- [ ] Email service configured (SendGrid/Mailgun)

## 🔧 **Deployment Steps**

### **Step 1: Database Setup**
```sql
-- Run in Supabase SQL Editor
-- Copy and paste contents of ops/sql/0001_consolidated.sql
-- Verify all tables and policies are created
```

### **Step 2: Edge Functions Deployment**
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy classify-media --no-verify-jwt
```

### **Step 3: Environment Variables**

#### **Vercel Environment Variables**:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### **Supabase Function Environment Variables**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PRICE_ID=price_your-price-id
OPENAI_API_KEY=sk-your-openai-key
```

### **Step 4: Vercel Deployment**
1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables
4. Deploy

## ✅ **Post-Deployment Verification**

### **Core Functionality Tests**
- [ ] User registration works
- [ ] User login works
- [ ] Pet profile creation works
- [ ] File uploads work (avatars, pet photos)
- [ ] Real-time messaging works
- [ ] Push notifications work

### **Advanced Features Tests**
- [ ] Payment flow works (if enabled)
- [ ] AI features work (if enabled)
- [ ] Mobile features work (if deployed)
- [ ] Analytics tracking works
- [ ] Feature flags work

### **Security Tests**
- [ ] RLS policies prevent unauthorized access
- [ ] File uploads respect ownership rules
- [ ] Admin panel requires proper permissions
- [ ] SQL guards prevent dangerous operations

## 🎛️ **Feature Flag Configuration**

Enable features gradually:

```sql
-- Enable for all users
UPDATE feature_flags SET is_enabled = true WHERE key = 'gamification_v1';

-- Enable for 25% of users
UPDATE feature_flags SET 
  is_enabled = true,
  rollout = '{"pct": 25}'
WHERE key = 'ai_autotag';

-- Enable for admin users only
UPDATE feature_flags SET 
  is_enabled = true,
  rollout = '{"roles": ["admin", "super_admin"]}'
WHERE key = 'payments_billing';
```

## 📊 **Monitoring Setup**

### **Analytics Verification**
1. Check `event_log` table for telemetry data
2. Verify `mv_daily_metrics` materialized view updates
3. Monitor user engagement metrics
4. Track error rates and performance

### **Health Checks**
- [ ] Database connection healthy
- [ ] Storage buckets accessible
- [ ] Edge functions responding
- [ ] Real-time subscriptions working
- [ ] External API integrations working

## 🚨 **Troubleshooting Guide**

### **Common Issues**

#### **Build Failures**
- Check environment variables are set correctly
- Verify all dependencies are installed
- Check for TypeScript errors

#### **Database Errors**
- Ensure migration was run with admin privileges
- Check RLS policies are applied correctly
- Verify foreign key constraints

#### **File Upload Issues**
- Confirm storage bucket policies are applied
- Check file size limits and validation
- Verify path-based ownership rules

#### **Real-time Issues**
- Ensure Supabase real-time is enabled
- Check WebSocket connections in browser dev tools
- Verify subscription filters are correct

#### **Mobile Issues**
- Check Capacitor configuration
- Verify native permissions are granted
- Test on actual devices, not just simulators

### **Debug Commands**
```bash
# Check bucket name compliance
npm run check-buckets

# Run tests
npm run test

# Build and check for errors
npm run build

# Lint code
npm run lint
```

## 📈 **Performance Optimization**

### **Database Optimization**
- [ ] Indexes created for frequently queried columns
- [ ] Materialized views for complex analytics
- [ ] Query optimization for large datasets

### **Frontend Optimization**
- [ ] Code splitting implemented
- [ ] Image optimization and lazy loading
- [ ] Bundle size optimization
- [ ] Caching strategies implemented

### **Mobile Optimization**
- [ ] Touch targets properly sized
- [ ] Smooth animations and transitions
- [ ] Efficient image loading
- [ ] Battery usage optimization

## 🔄 **Maintenance Tasks**

### **Regular Tasks**
- [ ] Monitor error logs weekly
- [ ] Review user feedback and feature requests
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Review and update feature flags

### **Security Tasks**
- [ ] Review and rotate API keys quarterly
- [ ] Audit user permissions monthly
- [ ] Monitor for security vulnerabilities
- [ ] Update security policies as needed

## 📞 **Support Contacts**

- **Technical Issues**: Check GitHub issues
- **Deployment Issues**: Review Vercel/Supabase logs
- **Security Concerns**: Follow responsible disclosure
- **Feature Requests**: Create GitHub discussions

---

**Deployment Status: Ready for Production** ✅

PawPilot HQ is production-ready with comprehensive features, security measures, and monitoring capabilities!