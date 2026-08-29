const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../service-account.json');

let credential;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  credential = admin.credential.cert(serviceAccount);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const parsedKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(parsedKey);
  } catch (err) {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY parsing error, falling back to default credential');
    credential = admin.credential.applicationDefault();
  }
} else {
  console.warn(
    '⚠️ Warning: Neither service-account.json nor FIREBASE_SERVICE_ACCOUNT_KEY found. Initializing with default project ID configuration.'
  );
  credential = admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || 'namaste-mart-28c93',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'namaste-mart-28c93.firebasestorage.app',
  });
}

console.log('✅ Firebase Admin SDK Initialized Successfully!');

module.exports = admin;
