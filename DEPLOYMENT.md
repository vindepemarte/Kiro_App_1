# Production Deployment Guide

## ✅ Build Issues Fixed

The Firebase initialization errors during build time have been resolved:
- Firebase services now use lazy loading to prevent build-time initialization
- Configuration validation is skipped during build phase
- All services are build-safe and will only initialize when actually needed

## Environment Variables Required

Make sure to set these environment variables in your production deployment platform (Coolify, Vercel, etc.):

### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Google Gemini AI
```
GEMINI_API_KEY=your_gemini_api_key
```

### Application Configuration
```
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
NODE_ENV=production
```

## Deployment Steps

1. **Push your code to GitHub**
2. **Set environment variables** in your deployment platform
3. **Deploy using the provided Dockerfile**

## Docker Build Command (if needed)
```bash
docker build -t meeting-ai .
docker run -p 3001:3001 meeting-ai
```

## Coolify Specific Notes

- The `.npmrc` file will handle the peer dependency issues automatically
- The `Dockerfile` is optimized for production deployment
- Make sure all environment variables are set in Coolify's environment section
- The app will run on port 3001 by default

## Troubleshooting

If you encounter dependency issues:
1. Make sure `.npmrc` file is included in your repository
2. Verify all environment variables are set correctly
3. Check that Firebase project is properly configured
4. Ensure Gemini API key has proper permissions

## Production Checklist

- [ ] All environment variables set
- [ ] Firebase project configured
- [ ] Gemini API key active
- [ ] `.npmrc` file in repository
- [ ] `Dockerfile` in repository
- [ ] Code pushed to GitHub
- [ ] Deployment platform configured