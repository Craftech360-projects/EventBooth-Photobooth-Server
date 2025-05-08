const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event.controller");
const { verifyToken } = require("../middleware/auth.middleware");

// Get all events for the current user
router.get("/", verifyToken, eventController.getAllEvents);

// Get a single event by ID
router.get("/:id", verifyToken, eventController.getEventById);

// Create a new event
router.post("/", verifyToken, eventController.createEvent);

// Update an event
router.put("/:id", verifyToken, eventController.updateEvent);

// Delete an event
router.delete("/:id", verifyToken, eventController.deleteEvent);

module.exports = router;
