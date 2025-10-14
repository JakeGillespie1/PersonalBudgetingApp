# 🚀 Deployment Guide - Budgeting App MVP

## Overview
This guide will help you deploy your budgeting app using:
- **Frontend**: Firebase Hosting (Free)
- **Backend**: Render (Free tier available)

## Prerequisites
- Firebase project created
- Render account (free)
- GitHub repository

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name your project (e.g., "budgeting-app-mvp")
4. Enable Google Analytics (optional)
5. Note your **Project ID**

### 1.2 Update Firebase Configuration
1. Replace `your-firebase-project-id` in `.firebaserc` with your actual project ID
2. Update `frontend/src/firebase.ts` with your project's config

### 1.3 Firebase Authentication Setup
1. In Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Add your domain to authorized domains

### 1.4 Firebase Firestore Setup
1. In Firebase Console → Firestore Database
2. Create database in production mode
3. Set up security rules (see below)

## Step 2: Backend Deployment (Render)

### 2.1 Prepare Backend
1. Push your code to GitHub
2. Get your Firebase Admin SDK credentials:
   - Firebase Console → Project Settings → Service Accounts
   - Generate new private key (downloads JSON file)

### 2.2 Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `budgeting-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2.3 Environment Variables (Render)
Add these environment variables in Render dashboard:
```
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
CORS_ALLOWED_ORIGINS=https://your-firebase-project-id.web.app,https://your-firebase-project-id.firebaseapp.com
```

**Note**: Replace `your-firebase-project-id` with your actual Firebase project ID

## Step 3: Frontend Deployment (Firebase Hosting)

### 3.1 Update API URL
1. Copy `frontend/env.production.example` to `frontend/.env.production`
2. Replace `YOUR_RENDER_URL` with your actual Render backend URL

### 3.2 Build and Deploy
```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build frontend
cd frontend
npm run build

# Deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

## Step 4: Update CORS Settings

After frontend deployment:
1. Get your Firebase Hosting URL (e.g., `https://your-project-id.web.app`)
2. Update `CORS_ALLOWED_ORIGINS` in Render with your actual frontend URL

## Step 5: Firestore Security Rules

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow users to create new documents
    match /{document=**} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Step 6: Testing

1. Visit your Firebase Hosting URL
2. Create an account and test all features:
   - Monthly budget creation
   - Yearly summary
   - Account tracking
   - Data export

## Cost Breakdown

### Free Tier Limits:
- **Firebase Hosting**: 10GB storage, 360MB/day transfer
- **Firebase Auth**: Unlimited users
- **Firebase Firestore**: 1GB storage, 50K reads/day
- **Render**: 750 hours/month, sleeps after 15min inactivity

### Estimated Monthly Cost: $0 (within free limits)

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Update `CORS_ALLOWED_ORIGINS` in Render
2. **Authentication Errors**: Check Firebase project ID and service account key
3. **Build Failures**: Ensure all dependencies are in `package.json`

### Useful Commands:
```bash
# Check Firebase project
firebase projects:list

# View deployment logs
firebase hosting:channel:open live

# Test backend locally
cd backend && npm run dev
```

## Next Steps (Post-MVP)
- Set up custom domain
- Add monitoring (Sentry, LogRocket)
- Implement CI/CD pipeline
- Add automated backups
- Scale to paid tiers as needed
