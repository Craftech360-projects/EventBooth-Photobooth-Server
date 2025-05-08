const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/services.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Add validation middleware if needed
const validateServiceRequest = (req, res, next) => {
  const { eventId, serviceId, startDateTime, macId } = req.body;

  if (!eventId || !serviceId || !startDateTime || !macId) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields",
    });
  }

  next();
};

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all available services
router.get("/", serviceController.getServices);

// Get all service requests for the current user
router.get("/requests", serviceController.getServiceRequests);

// Get service requests for a specific event
router.get(
  "/requests/event/:eventId",
  serviceController.getServiceRequestsByEvent
);

// Create a new service request
router.post(
  "/requests",
  validateServiceRequest,
  serviceController.createServiceRequest
);

module.exports = router;
