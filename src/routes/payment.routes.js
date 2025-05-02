const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
} = require("../controllers/payment.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Create Razorpay order
router.post("/create-order", verifyToken, createOrder);

// Verify payment
router.post("/verify", verifyToken, verifyPayment);

module.exports = router;
