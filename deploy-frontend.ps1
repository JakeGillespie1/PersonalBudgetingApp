# Firebase Frontend Deployment Script
# This script builds and deploys the frontend to Firebase Hosting

Write-Host "🚀 Starting Firebase Frontend Deployment..." -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "✓ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "  npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Firebase
Write-Host ""
Write-Host "Checking Firebase authentication..." -ForegroundColor Yellow
try {
    $firebaseUser = firebase login:list 2>&1
    if ($firebaseUser -match "No authorized accounts") {
        Write-Host "⚠ Not logged in to Firebase. Logging in..." -ForegroundColor Yellow
        firebase login
    } else {
        Write-Host "✓ Firebase authentication verified" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Authentication check failed. Attempting login..." -ForegroundColor Yellow
    firebase login
}

# Clean old build
Write-Host ""
Write-Host "Cleaning old build..." -ForegroundColor Yellow
if (Test-Path "frontend/dist") {
    Remove-Item -Recurse -Force "frontend/dist"
    Write-Host "✓ Old build removed" -ForegroundColor Green
} else {
    Write-Host "✓ No old build to clean" -ForegroundColor Green
}

# Build frontend
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location frontend
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Build failed!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "✓ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed with error: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Verify build output
Write-Host ""
Write-Host "Verifying build output..." -ForegroundColor Yellow
if (Test-Path "frontend/dist/index.html") {
    Write-Host "✓ Build output verified" -ForegroundColor Green
} else {
    Write-Host "✗ Build output not found!" -ForegroundColor Red
    exit 1
}

# Deploy to Firebase
Write-Host ""
Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Yellow
try {
    firebase deploy --only hosting
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Deployment failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your app should be live shortly. Check Firebase Console for the URL." -ForegroundColor Cyan
} catch {
    Write-Host "✗ Deployment failed with error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All done!" -ForegroundColor Green

