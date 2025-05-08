const express = require("express");
const dotenv = require("dotenv");

// Load environment variables first
dotenv.config();

// Import modules that depend on environment variables
const { admin } = require("./config/firebase");
const configureServer = require("./server");

// Create Express app
const app = express();

// Configure server
configureServer(app);

// Start server
const PORT = parseInt(process.env.PORT, 10); // Parse PORT as an integer
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use. Shutting down...`);
    server.close();
    process.exit(1);
  } else {
    console.error("Server error:", error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});
