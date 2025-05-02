const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Decode the base64 service account key
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountBase64) {
      throw new Error('Firebase service account not found in environment variables');
    }
    
    const serviceAccountBuffer = Buffer.from(serviceAccountBase64, 'base64');
    const serviceAccount = JSON.parse(serviceAccountBuffer.toString('utf-8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    
    console.log('Firebase Admin SDK initialized successfully');
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Initialize Firebase immediately and export the instance
const firebaseAdmin = initializeFirebase();

module.exports = {
  admin: firebaseAdmin
};