#!/bin/bash

# Firebase Frontend Deployment Script
# This script builds and deploys the frontend to Firebase Hosting

echo "🚀 Starting Firebase Frontend Deployment..."
echo ""

# Check if Firebase CLI is installed
echo "Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo "✗ Firebase CLI not found. Please install it first:"
    echo "  npm install -g firebase-tools"
    exit 1
fi

FIREBASE_VERSION=$(firebase --version)
echo "✓ Firebase CLI found: $FIREBASE_VERSION"

# Check if user is logged in to Firebase
echo ""
echo "Checking Firebase authentication..."
if ! firebase login:list 2>&1 | grep -q "No authorized accounts"; then
    echo "✓ Firebase authentication verified"
else
    echo "⚠ Not logged in to Firebase. Logging in..."
    firebase login
fi

# Clean old build
echo ""
echo "Cleaning old build..."
if [ -d "frontend/dist" ]; then
    rm -rf frontend/dist
    echo "✓ Old build removed"
else
    echo "✓ No old build to clean"
fi

# Build frontend
echo ""
echo "Building frontend..."
cd frontend
if ! npm run build; then
    echo "✗ Build failed!"
    cd ..
    exit 1
fi
echo "✓ Build successful!"
cd ..

# Verify build output
echo ""
echo "Verifying build output..."
if [ -f "frontend/dist/index.html" ]; then
    echo "✓ Build output verified"
else
    echo "✗ Build output not found!"
    exit 1
fi

# Deploy to Firebase
echo ""
echo "Deploying to Firebase Hosting..."
if ! firebase deploy --only hosting; then
    echo "✗ Deployment failed!"
    exit 1
fi

echo ""
echo "✓ Deployment successful!"
echo ""
echo "Your app should be live shortly. Check Firebase Console for the URL."
echo ""
echo "🎉 All done!"

