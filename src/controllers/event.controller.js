const { admin } = require("../config/firebase");
const createError = require("http-errors");

// Get all events for the current user
const getAllEvents = async (req, res, next) => {
  try {
    const db = admin.firestore();
    const eventsRef = db.collection("events");

    // Query events for the current user
    const snapshot = await eventsRef.where("userId", "==", req.user.uid).get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const events = [];
    snapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json(events);
  } catch (error) {
    console.error("Error getting events:", error);
    next(createError(500, "Failed to retrieve events"));
  }
};

// Get a single event by ID
const getEventById = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    console.log("Event ID:", eventId);

    const db = admin.firestore();

    const eventDoc = await db.collection("events").doc(eventId).get();

    if (!eventDoc.exists) {
      return next(createError(404, "Event not found"));
    }

    // Check if the event belongs to the current user
    const eventData = eventDoc.data();
    if (eventData.userId !== req.user.uid) {
      return next(createError(403, "Unauthorized access to this event"));
    }

    res.json({
      id: eventDoc.id,
      ...eventData,
    });
  } catch (error) {
    console.error("Error getting event:", error);
    next(createError(500, "Failed to retrieve event"));
  }
};

// Create a new event
// ...existing code...

// Update the createEvent function to only require name
const createEvent = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return next(createError(400, "Event name is required"));
    }

    const db = admin.firestore();

    // Create event document with just the name
    const eventData = {
      name,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const eventRef = await db.collection("events").add(eventData);

    res.status(201).json({
      id: eventRef.id,
      ...eventData,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    next(createError(500, "Failed to create event"));
  }
};

// ...existing code...

// Update an event
const updateEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const updateData = req.body;

    const db = admin.firestore();
    const eventRef = db.collection("events").doc(eventId);

    // Check if event exists and belongs to user
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      return next(createError(404, "Event not found"));
    }

    if (eventDoc.data().userId !== req.user.uid) {
      return next(createError(403, "Unauthorized access to this event"));
    }

    // Update the event
    await eventRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get the updated document
    const updatedDoc = await eventRef.get();

    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    next(createError(500, "Failed to update event"));
  }
};

// Delete an event
const deleteEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const db = admin.firestore();
    const eventRef = db.collection("events").doc(eventId);

    // Check if event exists and belongs to user
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      return next(createError(404, "Event not found"));
    }

    if (eventDoc.data().userId !== req.user.uid) {
      return next(createError(403, "Unauthorized access to this event"));
    }

    // Delete the event
    await eventRef.delete();

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting event:", error);
    next(createError(500, "Failed to delete event"));
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
