const express = require('express');
const router = express.Router();
const { verifyUser } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Verify user token and create/update user in Firestore
router.get('/verify', verifyToken, verifyUser);

module.exports = router;