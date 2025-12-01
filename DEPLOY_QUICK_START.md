# Quick Deployment Guide

## Deploy Frontend to Firebase

### Option 1: Using npm script (Recommended - Cross-platform)
```bash
npm run deploy:frontend
```

### Option 2: Using PowerShell (Windows)
```powershell
.\deploy-frontend.ps1
```

Or using npm:
```bash
npm run deploy:frontend:ps1
```

### Option 3: Using Bash (Linux/Mac)
```bash
./deploy-frontend.sh
```

Or using npm:
```bash
npm run deploy:frontend:sh
```

## What the script does:

1. ✅ Checks if Firebase CLI is installed
2. ✅ Verifies/requests Firebase authentication
3. ✅ Cleans old build files
4. ✅ Builds the frontend (TypeScript + Vite)
5. ✅ Verifies build output
6. ✅ Deploys to Firebase Hosting

## Prerequisites:

- Node.js and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project configured (`.firebaserc` file exists)
- Logged in to Firebase: `firebase login`

## Troubleshooting:

- **"Firebase CLI not found"**: Run `npm install -g firebase-tools`
- **"Not logged in"**: Run `firebase login`
- **Build fails**: Check for TypeScript errors in `frontend/src`
- **Deployment fails**: Check Firebase project configuration in `.firebaserc`

## Manual Deployment:

If you prefer to deploy manually:

```bash
# 1. Build frontend
cd frontend
npm run build
cd ..

# 2. Deploy to Firebase
firebase deploy --only hosting
```

