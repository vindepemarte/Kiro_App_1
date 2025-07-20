# MeetingAI Deployment Guide for Coolify

## 🚀 Quick Fix for Current Deployment Issues

The deployment is failing because of two main issues that have now been **FIXED**:

1. ✅ **Import Error Fixed**: Updated `app/teams/page.tsx` to use correct named import
2. ✅ **Suspense Boundary Fixed**: Wrapped `useSearchParams()` in Suspense component in `app/auth/page.tsx`
3. ✅ **Environment Variables**: Added fallback values for build-time

## 🔧 Environment Variables Setup in Coolify

### Required Environment Variables

Set these in your Coolify project settings under **Environment Variables**:

```bash
# Firebase Configuration (REQUIRED)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Gemini AI Configuration (REQUIRED)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration (Optional - has defaults)
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.0-flash
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
NODE_ENV=production
```

### 📋 How to Get Firebase Credentials

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create a new one)
3. **Click the gear icon** → Project Settings
4. **Scroll down to "Your apps"** section
5. **Click on the web app** or create one if none exists
6. **Copy the config values** from the Firebase SDK snippet

### 🔑 How to Get Gemini API Key

1. **Go to Google AI Studio**: https://aistudio.google.com/
2. **Click "Get API Key"**
3. **Create a new API key** or use an existing one
4. **Copy the API key**

## 🛠️ Coolify Deployment Steps

### 1. Set Environment Variables
In your Coolify dashboard:
1. Go to your project
2. Click **Environment Variables**
3. Add each variable from the list above
4. Click **Save**

### 2. Redeploy
1. Click **Deploy** to trigger a new deployment
2. Monitor the build logs for any errors

### 3. Verify Deployment
After successful deployment:
1. Visit your app URL
2. Check `/debug.html` to verify environment variables are loaded
3. Test authentication flow

## 🔍 Troubleshooting

### Build Still Failing?

**Check Build Logs for:**
- Missing environment variables
- Import/export errors
- TypeScript errors

**Common Solutions:**
```bash
# If you see "Missing Firebase API Key"
# → Add NEXT_PUBLIC_FIREBASE_API_KEY to Coolify env vars

# If you see "useSearchParams() should be wrapped in suspense"
# → This is already fixed in the latest code

# If you see import errors
# → This is already fixed in the latest code
```

### Runtime Issues?

**Check Browser Console for:**
- Firebase initialization errors
- Authentication failures
- Network errors

**Solutions:**
1. **Firebase Auth Domain**: Make sure your domain is added to Firebase Auth settings
2. **CORS Issues**: Add your domain to Firebase authorized domains
3. **API Quotas**: Check Firebase and Gemini API usage limits

## 🎯 Firebase Project Setup

### Enable Required Services

1. **Authentication**:
   - Go to Firebase Console → Authentication
   - Click "Get Started"
   - Enable **Google** and **Anonymous** sign-in methods

2. **Firestore Database**:
   - Go to Firebase Console → Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (we'll update rules later)

3. **Security Rules**:
   - Deploy the included `firestore.rules` file:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Add Your Domain

1. Go to Firebase Console → Authentication → Settings
2. Click **Authorized domains**
3. Add your Coolify domain (e.g., `your-app.coolify.domain.com`)

## 📱 Post-Deployment Checklist

### ✅ Verify Core Features
- [ ] Home page loads correctly
- [ ] Authentication works (Google + Anonymous)
- [ ] Dashboard is accessible
- [ ] Teams page works
- [ ] Analytics page works  
- [ ] Settings page works
- [ ] File upload and processing works
- [ ] Mobile responsive design works

### ✅ Test Team Features
- [ ] Create a team
- [ ] Invite team members
- [ ] Accept team invitations
- [ ] Assign tasks to team members
- [ ] Receive notifications

## 🆘 Still Having Issues?

### Debug Steps:
1. **Check Environment Variables**: Visit `/debug.html` on your deployed app
2. **Check Browser Console**: Look for JavaScript errors
3. **Check Firebase Console**: Look for authentication/database errors
4. **Check Coolify Logs**: Look for build/runtime errors

### Get Help:
- Check the `FIX_SUMMARY.md` file for detailed troubleshooting
- Run `node scripts/fix-auth-issues.js` locally for diagnostics
- Verify your Firebase project configuration

## 🎉 Success!

Once deployed successfully, your MeetingAI app will have:
- ✅ Complete authentication system
- ✅ Team collaboration features
- ✅ Mobile-responsive design
- ✅ Real-time notifications
- ✅ Task assignment and management
- ✅ Analytics dashboard

Your app is now production-ready! 🚀