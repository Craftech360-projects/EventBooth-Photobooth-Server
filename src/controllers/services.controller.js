const { db } = require("../config/firebase");

// helper functions
const calculateEndDateTime = (startDateTime, plan) => {
  const start = new Date(startDateTime);
  switch (plan?.toLowerCase()) {
    case "silver":
      return new Date(start.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case "gold":
      return new Date(start.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    case "platinum":
      return new Date(start.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    default:
      return new Date(start.getTime() + 24 * 60 * 60 * 1000); // Default to Silver
  }
};

const validateMacAddress = (macId) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(macId);
};

// Get all available services
const getServices = async (req, res, next) => {
  try {
    const servicesSnapshot = await db.collection("services").get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      status: "success",
      data: services,
    });
  } catch (error) {
    console.error("Error getting services:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to get services",
    });
  }
};

// Get all service requests for the current user
const getServiceRequests = async (req, res, next) => {
  try {
    const userId = req.user.uid;

    // Get all events for this user
    const eventsSnapshot = await db
      .collection("events")
      .where("userId", "==", userId)
      .get();

    const eventIds = [];
    eventsSnapshot.forEach((doc) => {
      eventIds.push(doc.id);
    });

    // If user has no events, return empty array
    if (eventIds.length === 0) {
      return res.status(200).json({
        status: "success",
        data: [],
      });
    }

    // Get service requests for all user events
    const requestsSnapshot = await db
      .collection("serviceRequests")
      .where("eventId", "in", eventIds)
      .get();

    const requests = [];
    requestsSnapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      status: "success",
      data: requests,
    });
  } catch (error) {
    console.error("Error getting service requests:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to get service requests",
    });
  }
};

// Get service requests for a specific event
const getServiceRequestsByEvent = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { eventId } = req.params;

    // Verify the event belongs to the user
    const eventDoc = await db.collection("events").doc(eventId).get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Event not found",
      });
    }

    const eventData = eventDoc.data();

    if (eventData.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this event",
      });
    }

    // Get service requests for this event
    const requestsSnapshot = await db
      .collection("serviceRequests")
      .where("eventId", "==", eventId)
      .get();

    const requests = [];
    requestsSnapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return res.status(200).json({
      status: "success",
      data: requests,
    });
  } catch (error) {
    console.error("Error getting service requests for event:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to get service requests for event",
    });
  }
};

// Create a new service request
const createServiceRequest = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { eventId, serviceId, startDateTime, macId } = req.body;

    // Validate required fields
    if (!eventId || !serviceId || !startDateTime || !macId) {
      return res.status(400).json({
        status: "error",
        message:
          "Event ID, Service ID, Start Date Time, and MAC ID are required",
      });
    }

    // Validate MAC address format
    if (!validateMacAddress(macId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid MAC address format",
      });
    }

    // Get user's plan from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const userData = userDoc.data();
    if (!userData.plan) {
      return res.status(403).json({
        status: "error",
        message: "You need to purchase a plan to request services",
      });
    }

    // Calculate end date time based on plan
    const endDateTime = calculateEndDateTime(startDateTime, userData.plan);

    // Create service request
    const requestData = {
      eventId,
      serviceId,
      userId,
      macId,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: endDateTime.toISOString(),
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const requestRef = await db.collection("serviceRequests").add(requestData);

    return res.status(201).json({
      status: "success",
      data: {
        id: requestRef.id,
        ...requestData,
      },
    });
  } catch (error) {
    console.error("Error creating service request:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create service request",
    });
  }
};

module.exports = {
  getServices,
  getServiceRequests,
  getServiceRequestsByEvent,
  createServiceRequest,
};
