const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const paymentRoutes = require("./routes/payment.routes");

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

const configureServer = (app) => {
  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? "https://your-production-domain.com"
          : "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Request logging
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Parse JSON bodies
  app.use(express.json());

  // Apply rate limiting to API routes
  app.use("/api", apiLimiter);

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/payment", paymentRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      status: "error",
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  return app;
};

module.exports = configureServer;
