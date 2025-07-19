# MeetingAI Deployment Guide

## 🚀 Quick Deployment Checklist

### 1. Environment Variables Setup in Coolify

Set these **exact** environment variable names in your Coolify deployment:

```bash
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI Configuration (Required)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.0-flash

# App Configuration (Optional - has defaults)
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
```

### 2. Firebase Project Setup

1. **Enable Anonymous Authentication:**
   - Go to Firebase Console → Authentication → Sign-in methods
   - Enable "Anonymous" authentication
   - Save changes

2. **Add Authorized Domains:**
   - In Authentication → Settings → Authorized domains
   - Add your production domain (e.g., `yourdomain.com`)
   - Save changes

3. **Firestore Database:**
   - Go to Firestore Database
   - Create database in production mode
   - Set up security rules (or start in test mode for MVP)

### 3. Google AI Studio Setup

1. **Get Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key
   - Copy the key for `NEXT_PUBLIC_GEMINI_API_KEY`

### 4. Deploy and Test

1. **Deploy the application** in Coolify
2. **Test environment variables** by visiting `/debug.html` on your deployed site
3. **Test authentication** by trying anonymous login
4. **Test file upload** with a sample meeting transcript

## 🔧 Troubleshooting Guide

### Environment Variables Not Loading

**Symptoms:** 
- `/debug.html` shows missing variables
- Authentication fails with configuration errors

**Solutions:**
1. Check variable names are **exactly** as listed above (case-sensitive)
2. Ensure variables are set in Coolify deployment settings
3. Redeploy after adding variables
4. Check browser console for specific error messages

### Firebase Authentication Errors

**Symptoms:**
- "Firebase configuration is invalid" errors
- Anonymous authentication fails

**Solutions:**
1. Verify Firebase project has anonymous auth enabled
2. Check that your domain is in authorized domains list
3. Ensure API key has proper permissions
4. Check browser network tab for 403/401 errors

### Gemini AI Processing Errors

**Symptoms:**
- File upload works but AI processing fails
- "API key invalid" errors

**Solutions:**
1. Verify Gemini API key is correct
2. Check API key has proper permissions in Google AI Studio
3. Ensure you haven't exceeded API quotas
4. Check browser console for specific API error messages

### Build or Deployment Errors

**Symptoms:**
- Build fails in Coolify
- Application doesn't start

**Solutions:**
1. Check Coolify build logs for specific errors
2. Ensure all dependencies are properly installed
3. Verify Dockerfile is using correct Node.js version
4. Check that environment injection script runs successfully

## 🧪 Testing Your Deployment

### 1. Environment Variables Test
Visit `https://yourdomain.com/debug.html` and verify:
- All required variables show as "PRESENT"
- No variables show as "MISSING"

### 2. Authentication Test
1. Go to your main site
2. Click "Continue Anonymously"
3. Should redirect to dashboard without errors

### 3. File Processing Test
1. Upload a sample meeting transcript (.txt file)
2. Should process and show summary + action items
3. Should save to your meeting history

### 4. Full Workflow Test
1. Upload transcript → Process → View report → Export
2. All steps should work without errors

## 📋 Sample Environment Variables

Here's a template with placeholder values:

```bash
# Firebase - Replace with your actual values
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=meeting-ai-12345.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=meeting-ai-12345
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=meeting-ai-12345.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Gemini AI - Replace with your actual key
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyD...
NEXT_PUBLIC_GEMINI_MODEL=gemini-2.0-flash

# App Config - Can use defaults
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
```

## 🆘 Emergency Fixes

### If Authentication Completely Fails
1. Check `/debug.html` first
2. Verify Firebase project settings
3. Try creating a new Firebase API key
4. Check browser console for specific errors

### If Nothing Works
1. Check Coolify deployment logs
2. Verify all environment variables are set
3. Try redeploying from scratch
4. Check Firebase and Google AI Studio project settings

## 📞 Support

If you're still having issues:
1. Check the browser console for specific error messages
2. Check Coolify deployment logs
3. Verify all services (Firebase, Gemini) are properly configured
4. Test with the `/debug.html` page to isolate environment variable issues

The application is designed to be robust and provide clear error messages. Most issues are related to environment variable configuration or service setup.