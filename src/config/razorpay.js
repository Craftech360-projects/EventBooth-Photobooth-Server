const Razorpay = require("razorpay");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Razorpay
const initializeRazorpay = () => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        "Razorpay credentials not found in environment variables"
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    console.log("Razorpay initialized successfully");
    return razorpay;
  } catch (error) {
    console.error("Error initializing Razorpay:", error);
    throw error;
  }
};

module.exports = {
  razorpay: initializeRazorpay(),
};
