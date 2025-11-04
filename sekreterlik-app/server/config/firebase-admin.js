// Firebase Admin SDK Configuration
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Firebase Admin SDK key dosyasının yolu
const keyPath = path.join(__dirname, '../../client/firebase-admin-key.json');

// Key dosyasını oku
let serviceAccount;
try {
  if (fs.existsSync(keyPath)) {
    serviceAccount = require(keyPath);
  } else {
    console.error('⚠️ Firebase Admin SDK key file not found at:', keyPath);
    console.error('⚠️ Firebase Admin SDK features will not be available');
  }
} catch (error) {
  console.error('⚠️ Error loading Firebase Admin SDK key:', error);
}

// Firebase Admin SDK'yı initialize et
if (serviceAccount) {
  try {
    // Eğer zaten initialize edilmişse, tekrar initialize etme
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      console.log('ℹ️ Firebase Admin SDK already initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
  }
} else {
  console.warn('⚠️ Firebase Admin SDK not initialized (key file missing)');
}

module.exports = admin;

