# 🗄️ Storage Bucket Standardization Guide

## ⚠️ **CRITICAL: Manual Execution Required**

Storage policies **MUST** be applied manually due to privilege requirements. The application cannot create storage policies as it runs with insufficient privileges.

## 📋 **Step-by-Step Instructions**

### **Step 1: Apply Database Migration**

1. **Open Supabase Dashboard**
   - Go to your project dashboard at [supabase.com](https://supabase.com)
   - Navigate to **SQL Editor** in the sidebar

2. **Copy Migration SQL**
   - Open `supabase/migrations/20250819_bucket_standardization.sql`
   - Copy the entire SQL content

3. **Execute Migration**
   - Paste the SQL into the SQL Editor
   - Click **Run** (executes with admin privileges)

4. **Verify Success**
   - Run the verification query at the end of the migration file

### **Step 2: Code Changes Applied**

✅ **Bucket Constants** - Created `src/lib/buckets.ts` with standardized names
✅ **Upload Function** - Updated to use bucket keys and enforce path ownership
✅ **All Upload Calls** - Converted to use new bucket constants
✅ **ESLint Rules** - Added rules to prevent legacy bucket usage
✅ **CI Checks** - Added GitHub workflow to catch regressions

## 🛡️ **Security Model**

### **New Underscore Buckets (Active):**
- `group_avatars` (public read)
- `album_photos` (public read)
- `lost_found_photos` (public read)
- `reel_videos` (public read)
- `cause_images` (public read)
- `health_attachments` (private - owner only)

### **Legacy Hyphen Buckets (Read-Only):**
- `group-avatars` → read-only
- `album-photos` → read-only
- `lost-found-photos` → read-only
- `reel-videos` → read-only
- `cause-images` → read-only

### **Policies Applied:**
- **Public Read** - Anyone can view files in public buckets
- **Authenticated Insert** - Only authenticated users can upload to their own folder (`{user_id}/filename`)
- **Owner Update/Delete** - Only file owner can modify their files
- **Path-based Ownership** - Enforced using `split_part(name,'/',1)=auth.uid()::text`

## ✅ **Expected Results**

After running the migration:
- ✅ New uploads use underscore buckets with proper security
- ✅ Legacy files remain accessible (read-only)
- ✅ No duplicate policy errors
- ✅ Path-based ownership enforced
- ✅ CI prevents regressions

## 🔧 **Troubleshooting**

**If you see "42501: must be owner of table objects":**
- You're running the migration from the application (insufficient privileges)
- Use Supabase Dashboard SQL Editor or CLI instead

**If you see "42710: policy already exists":**
- The migration is idempotent and will handle existing policies
- Re-run the migration - it should complete successfully

## 🚀 **After Migration**

Once the storage policies are applied:
1. All file uploads will use standardized underscore buckets
2. Legacy files remain accessible for backward compatibility
3. Path-based ownership is enforced for security
4. CI checks prevent future regressions

**Remember: This migration only needs to be run once per Supabase project!**