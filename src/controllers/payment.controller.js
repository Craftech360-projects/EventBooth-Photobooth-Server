const Razorpay = require('razorpay');
const { admin } = require("../config/firebase");
const createError = require("http-errors");
const crypto = require("crypto");
const { firestore } = admin;
const db = firestore();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
const createOrder = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { planId, amount } = req.body;

    // Validate input
    if (!planId || !amount) {
      return next(createError(400, "Plan ID and amount are required"));
    }

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `order_${uid}_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    // Store order in Firestore
    await db
      .collection("orders")
      .doc(order.id)
      .set({
        orderId: order.id,
        userId: uid,
        planId,
        amount: amount * 100,
        currency: "INR",
        status: "created",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.status(200).json({
      status: "success",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return next(createError(500, "Error creating payment order"));
  }
};

// Verify payment
const verifyPayment = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planId,
      amount,
    } = req.body;

    // Validate input
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return next(
        createError(400, "Payment verification details are required")
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return next(createError(400, "Invalid payment signature"));
    }

    // Get plan details
    const plans = {
      silver: { requests: 60, validity: 30 },
      gold: { requests: 80, validity: 60 },
      platinum: { requests: 100, validity: 90 },
    };

    const plan = plans[planId];
    if (!plan) {
      return next(createError(400, "Invalid plan ID"));
    }

    // Update order status in Firestore
    await db.collection("orders").doc(razorpay_order_id).update({
      status: "paid",
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user subscription
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return next(createError(404, "User not found"));
    }

    const userData = userDoc.data();
    const currentRequests = userData.totalRequests || 0;

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + plan.validity);

    await userRef.update({
      totalRequests: currentRequests + plan.requests,
      hasPurchasedPlan: true,
      currentPlan: planId,
      planPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      planExpiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
    });

    return res.status(200).json({
      status: "success",
      message: "Payment verified successfully",
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        plan: planId,
        requests: plan.requests,
        expiresAt: expirationDate,
      },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return next(createError(500, "Error verifying payment"));
  }
};

module.exports = {
  razorpay,
  createOrder,
  verifyPayment,

};
