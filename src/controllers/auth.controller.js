const { admin } = require('../config/firebase');
const createError = require('http-errors');
const { firestore } = admin;
const db = firestore();

// Verify user and create/update in Firestore
const verifyUser = async (req, res, next) => {
  try {
    const { uid, email, displayName, photoURL } = req.user;
    
    // Check if user exists in Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        uid,
        email,
        displayName,
        photoURL,
        totalRequests: 0,
        usedRequests: 0,
        pendingRequests: 0,
        totalEvents: 0,
        hasPurchasedPlan: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          uid,
          email,
          displayName,
          photoURL,
          isNewUser: true
        }
      });
    }
    
    // User exists, return user data
    const userData = userDoc.data();
    
    return res.status(200).json({
      status: 'success',
      message: 'User verified successfully',
      data: {
        ...userData,
        isNewUser: false
      }
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    return next(createError(500, 'Error verifying user'));
  }
};

module.exports = {
  verifyUser
};