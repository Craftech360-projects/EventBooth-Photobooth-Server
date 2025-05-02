const { admin } = require('../config/firebase');
const createError = require('http-errors');

// Verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Unauthorized: No token provided'));
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture
    };
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return next(createError(401, 'Unauthorized: Token expired'));
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return next(createError(401, 'Unauthorized: Token revoked'));
    }
    
    return next(createError(401, 'Unauthorized: Invalid token'));
  }
};

module.exports = {
  verifyToken
};