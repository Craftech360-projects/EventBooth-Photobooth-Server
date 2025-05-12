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

// Verify service authentication code
const verifyServiceAuthCode = async (req, res, next) => {
  try {
    const { serviceId, authCode, timestamp } = req.body;

    if (!serviceId || !authCode || !timestamp) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields: serviceId, authCode, or timestamp",
      });
    }

    // Get the service request from Firestore
    const serviceRequestDoc = await db
      .collection("serviceRequests")
      .doc(serviceId)
      .get();

    if (!serviceRequestDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Service request not found",
      });
    }

    const serviceRequest = serviceRequestDoc.data();

    // Check if the service is active
    const now = new Date();
    const startDate = serviceRequest.startDateTime.toDate();
    const endDate = serviceRequest.endDateTime.toDate();

    if (now < startDate || now > endDate) {
      return res.status(403).json({
        status: "error",
        message: "Service is not active at this time",
      });
    }

    // Generate the expected code for the given timestamp
    // This should match the logic in the AuthCode.jsx component
    const expectedCode = generateAuthCodeForTimestamp(serviceId, timestamp);

    // Compare the received code with the expected code
    if (authCode === expectedCode) {
      return res.status(200).json({
        status: "success",
        message: "Authentication successful",
        data: {
          serviceId,
          isValid: true,
        },
      });
    } else {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication code",
        data: {
          serviceId,
          isValid: false,
        },
      });
    }
  } catch (error) {
    console.error("Error verifying service auth code:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to verify authentication code",
    });
  }
};

// Helper function to generate auth code for a timestamp
// This should match the logic in the AuthCode.jsx component
const generateAuthCodeForTimestamp = (serviceId, timestamp) => {
  // Generate a random 6-digit number based on serviceId and timestamp
  // This is a simplified version - in production, use a more secure algorithm
  const seed = `${serviceId}_${timestamp}`;
  const hash = require("crypto")
    .createHash("sha256")
    .update(seed)
    .digest("hex");

  // Take the first 6 digits of the hash
  const min = 100000; // Smallest 6-digit number
  const max = 999999; // Largest 6-digit number

  // Convert the first 6 characters of the hash to a number between min and max
  const hashNum = parseInt(hash.substring(0, 8), 16);
  const code = (hashNum % (max - min + 1)) + min;

  // Convert to string and ensure it's 6 digits
  return String(code).padStart(6, "0");
};

// Get service request by ID
const getServiceRequestById = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;

    // Get the service request
    const requestDoc = await db
      .collection("serviceRequests")
      .doc(requestId)
      .get();

    if (!requestDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Service request not found",
      });
    }

    const requestData = requestDoc.data();

    // Verify the request belongs to one of the user's events
    const eventDoc = await db
      .collection("events")
      .doc(requestData.eventId)
      .get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Associated event not found",
      });
    }

    const eventData = eventDoc.data();

    if (eventData.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this service request",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        id: requestDoc.id,
        ...requestData,
      },
    });
  } catch (error) {
    console.error("Error getting service request:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to get service request",
    });
  }
};

module.exports = {
  getServices,
  getServiceRequests,
  getServiceRequestsByEvent,
  createServiceRequest,
  verifyServiceAuthCode,
  getServiceRequestById,
};
