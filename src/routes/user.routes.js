const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
} = require("../controllers/user.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Get user profile
router.get("/profile", verifyToken, getUserProfile);

// Update user profile
router.put("/profile", verifyToken, updateUserProfile);

module.exports = router;
