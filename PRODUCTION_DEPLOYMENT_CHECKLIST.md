# Production Deployment Checklist

## 🚨 Immediate Fixes Required

### 1. Firebase Firestore Rules
**Status:** ❌ CRITICAL - Must fix immediately

**Problem:** Permission denied errors preventing user profile creation and notifications

**Solution:**
```bash
# Deploy the updated firestore.rules file
firebase deploy --only firestore:rules
```

**Verification:**
- Users should be able to create profiles
- Notifications should load without permission errors

### 2. Firestore Indexes
**Status:** ❌ CRITICAL - Must fix immediately

**Problem:** "The query requires an index" errors

**Solution:**
1. Click the index creation link from your console error:
   ```
   https://console.firebase.google.com/v1/r/project/meeting-ai-a3c96/firestore/indexes?create_composite=...
   ```
2. Or manually create in Firebase Console:
   - Collection: `artifacts/meeting-ai-mvp/notifications`
   - Fields: `userId` (ASC), `createdAt` (DESC), `__name__` (ASC)

**Verification:**
- Notification queries should work without index errors
- Check Firebase Console > Firestore > Indexes shows "Enabled"

### 3. Environment Variables
**Status:** ⚠️ WARNING - Optional but recommended

**Missing Variables in Coolify:**
```bash
NEXT_PUBLIC_LOG_ENDPOINT=""
NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT=""
NEXT_PUBLIC_ANALYTICS_ENDPOINT=""
```

**Solution:**
- Add these to Coolify environment variables (can be empty for now)
- Or set up external logging services (Sentry, LogRocket, etc.)

## 🔧 Configuration Steps

### Step 1: Update Firestore Rules
1. The `firestore.rules` file has been updated
2. Deploy to Firebase:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Step 2: Create Required Indexes
1. Go to Firebase Console
2. Navigate to Firestore > Indexes
3. Create the notifications index (see setup-firestore-indexes.md)

### Step 3: Verify Authentication
1. Test user sign-in flow
2. Verify profile creation works
3. Check notification loading

### Step 4: Monitor Health Status
The health monitor is showing "unhealthy" due to:
- Firestore permission errors
- Missing indexes
- Authentication issues

After fixing the above, health should improve to "healthy" or "degraded".

## 🏥 Health Monitor Issues

**Current Status:** System health is unhealthy (3 unhealthy checks)

**Expected Issues:**
1. **Firebase Config Check** - Should pass once rules are deployed
2. **Network Connectivity** - May fail due to Firestore errors
3. **Error Rate Check** - High due to permission errors

**After Fixes:**
- Health should show "healthy" or "degraded"
- Error rate should decrease significantly
- Firestore operations should work normally

## 📊 Monitoring Setup

### Current Monitoring Status
✅ **Logger** - Working (logs visible in console)
✅ **Error Tracker** - Working (capturing errors)
✅ **Performance Monitor** - Working
✅ **Health Monitor** - Working (showing actual issues)

### Production Monitoring Dashboard
Access the monitoring dashboard by adding the ProductionMonitor component to your app:

```tsx
import { ProductionMonitor } from '@/components/production-monitor';

// Add to your admin/monitoring page
<ProductionMonitor />
```

## 🔒 Security Verification

### Firestore Rules Status
✅ **Updated Rules** - More permissive for initial setup
✅ **Authentication Required** - All operations require auth
✅ **User Isolation** - Users can only access their own data
⚠️ **Team Permissions** - Simplified for now (can be tightened later)

### Security Recommendations
1. **Monitor Error Rates** - Watch for unusual permission errors
2. **Review User Access** - Ensure users only see their data
3. **Audit Team Operations** - Verify team member access is correct

## 🚀 Deployment Steps

### Immediate Actions (Do Now)
1. **Deploy Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Create Notifications Index:**
   - Use the error link from console, or
   - Create manually in Firebase Console

3. **Test Application:**
   - Sign in as a user
   - Try creating a profile
   - Check notifications load

### Optional Improvements
1. **Add Missing Environment Variables** to Coolify
2. **Set up External Monitoring** (Sentry, LogRocket)
3. **Configure Alerts** for error rates
4. **Add Performance Monitoring** endpoints

## 🧪 Testing Checklist

### After Deploying Fixes
- [ ] User can sign in successfully
- [ ] User profile creation works
- [ ] Notifications load without errors
- [ ] No "permission denied" errors in console
- [ ] No "index required" errors in console
- [ ] Health monitor shows improved status
- [ ] Error rate decreases in monitoring dashboard

### Performance Verification
- [ ] Page load times are acceptable
- [ ] No memory leaks in browser
- [ ] Firestore queries are efficient
- [ ] Monitoring overhead is minimal

## 📈 Success Metrics

### Before Fixes
- ❌ Permission denied errors
- ❌ Index requirement errors
- ❌ User profile creation fails
- ❌ Notifications don't load
- ❌ Health status: unhealthy

### After Fixes (Expected)
- ✅ Users can create profiles
- ✅ Notifications load successfully
- ✅ No permission errors
- ✅ No index errors
- ✅ Health status: healthy/degraded
- ✅ Error rate < 5%

## 🆘 Troubleshooting

### If Issues Persist After Fixes

1. **Check Firebase Console:**
   - Verify rules are deployed
   - Confirm indexes are "Enabled"
   - Check authentication logs

2. **Browser Console:**
   - Clear cache and reload
   - Check for new error messages
   - Verify network requests succeed

3. **Monitoring Dashboard:**
   - Check error rates and types
   - Review performance metrics
   - Monitor health check status

### Common Issues
- **Rules deployment delay:** Wait 1-2 minutes after deployment
- **Index building time:** Can take 5-30 minutes for complex indexes
- **Cache issues:** Clear browser cache after rule changes

## 📞 Support

If issues persist after following this checklist:

1. **Check the monitoring dashboard** for detailed error information
2. **Review browser console** for specific error messages
3. **Verify Firebase Console** shows rules and indexes are properly deployed
4. **Test with a fresh browser session** to rule out cache issues

The monitoring system will help identify any remaining issues and provide detailed error tracking for debugging.