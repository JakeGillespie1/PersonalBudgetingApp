#!/usr/bin/env node

/**
 * Firebase Frontend Deployment Script (Cross-platform)
 * This script builds and deploys the frontend to Firebase Hosting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`✗ Command failed: ${command}`, 'red');
    process.exit(1);
  }
}

function checkFirebaseCLI() {
  log('Checking Firebase CLI...', 'yellow');
  try {
    const version = execSync('firebase --version', { encoding: 'utf-8' }).trim();
    log(`✓ Firebase CLI found: ${version}`, 'green');
    return true;
  } catch (error) {
    log('✗ Firebase CLI not found. Please install it first:', 'red');
    log('  npm install -g firebase-tools', 'yellow');
    process.exit(1);
  }
}

function checkFirebaseAuth() {
  log('', 'reset');
  log('Checking Firebase authentication...', 'yellow');
  try {
    const authList = execSync('firebase login:list', { encoding: 'utf-8' });
    if (authList.includes('No authorized accounts')) {
      log('⚠ Not logged in to Firebase. Logging in...', 'yellow');
      exec('firebase login');
    } else {
      log('✓ Firebase authentication verified', 'green');
    }
  } catch (error) {
    log('⚠ Authentication check failed. Attempting login...', 'yellow');
    exec('firebase login');
  }
}

function cleanBuild() {
  log('', 'reset');
  log('Cleaning old build...', 'yellow');
  const distPath = path.join('frontend', 'dist');
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
    log('✓ Old build removed', 'green');
  } else {
    log('✓ No old build to clean', 'green');
  }
}

function buildFrontend() {
  log('', 'reset');
  log('Building frontend...', 'yellow');
  process.chdir('frontend');
  exec('npm run build');
  log('✓ Build successful!', 'green');
  process.chdir('..');
}

function verifyBuild() {
  log('', 'reset');
  log('Verifying build output...', 'yellow');
  const indexPath = path.join('frontend', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    log('✓ Build output verified', 'green');
  } else {
    log('✗ Build output not found!', 'red');
    process.exit(1);
  }
}

function deployToFirebase() {
  log('', 'reset');
  log('Deploying to Firebase Hosting...', 'yellow');
  exec('firebase deploy --only hosting');
  log('', 'reset');
  log('✓ Deployment successful!', 'green');
  log('', 'reset');
  log('Your app should be live shortly. Check Firebase Console for the URL.', 'cyan');
}

// Main execution
log('🚀 Starting Firebase Frontend Deployment...', 'cyan');
log('', 'reset');

checkFirebaseCLI();
checkFirebaseAuth();
cleanBuild();
buildFrontend();
verifyBuild();
deployToFirebase();

log('', 'reset');
log('🎉 All done!', 'green');

