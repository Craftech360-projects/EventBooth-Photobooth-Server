const { admin } = require('../config/firebase');
const createError = require('http-errors');
const { firestore } = admin;
const db = firestore();

// Get user profile
const getUserProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    // Get user document from Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return next(createError(404, 'User not found'));
    }
    
    const userData = userDoc.data();
    
    return res.status(200).json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return next(createError(500, 'Error retrieving user profile'));
  }
};

// Update user profile
const updateUserProfile = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { displayName, phone } = req.body;
    
    // Validate input
    if (!displayName && !phone) {
      return next(createError(400, 'No data provided for update'));
    }
    
    // Prepare update data
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (phone) updateData.phone = phone;
    
    // Update timestamp
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Update user document
    const userRef = db.collection('users').doc(uid);
    await userRef.update(updateData);
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updateData
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return next(createError(500, 'Error updating user profile'));
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};