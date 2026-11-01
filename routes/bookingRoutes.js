import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const bookingCollection = db.collection("bookings");
const studioCollection = db.collection("studios");

const STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

// "HH:mm" -> minutes since midnight (returns null if invalid)
function toMinutes(time) {
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Finds a Confirmed booking that overlaps the requested slot
function findConflict({ studioId, date, startMinutes, endMinutes, excludeId }) {
  const query = {
    studioId,
    date,
    status: "Confirmed",
    startMinutes: { $lt: endMinutes },
    endMinutes: { $gt: startMinutes },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return bookingCollection.findOne(query);
}

// Public: confirmed slots for a studio on a date (used by the booking modal)
router.get("/availability/:studioId", async (req, res) => {
  try {
    const { studioId } = req.params;
    const { date } = req.query;

    if (!ObjectId.isValid(studioId) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return res.status(400).json({
        success: false,
        message: "A valid studio ID and date (YYYY-MM-DD) are required.",
      });
    }

    const slots = await bookingCollection
      .find(
        { studioId, date, status: "Confirmed" },
        { projection: { startTime: 1, endTime: 1, _id: 0 } }
      )
      .sort({ startMinutes: 1 })
      .toArray();

    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch availability.",
    });
  }
});

// Protected: my bookings (as a guest)
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const bookings = await bookingCollection
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your bookings.",
    });
  }
});

// Protected: bookings received on studios I host
router.get("/hosting", verifyToken, async (req, res) => {
  try {
    const bookings = await bookingCollection
      .find({ hostId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch hosting requests.",
    });
  }
});

// Protected: create a booking (status = Pending)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { studioId, date, startTime, endTime, notes } = req.body;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      return res.status(400).json({
        success: false,
        message: "Please choose a valid date.",
      });
    }

    const todayUtc = new Date().toISOString().slice(0, 10);
    if (date < todayUtc) {
      return res.status(400).json({
        success: false,
        message: "You can't book a date in the past.",
      });
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === null || endMinutes === null) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid start and end times.",
      });
    }

    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time.",
      });
    }

    const studio = await studioCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    if (studio.ownerId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You can't book your own studio.",
      });
    }

    const conflict = await findConflict({
      studioId,
      date,
      startMinutes,
      endMinutes,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `This slot overlaps an existing confirmed booking (${conflict.startTime} - ${conflict.endTime}). Please pick a different time.`,
      });
    }

    const hours = (endMinutes - startMinutes) / 60;

    const booking = {
      studioId,
      studioTitle: studio.title,
      studioImage: studio.imageUrl,
      studioLocation: studio.location,
      hourlyRate: studio.hourlyRate,
      securityDeposit: studio.securityDeposit,
      date,
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      hours,
      totalPrice: Number((studio.hourlyRate * hours).toFixed(2)),
      notes: typeof notes === "string" ? notes.trim().slice(0, 500) : "",
      status: "Pending",
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      hostId: studio.ownerId,
      hostEmail: studio.ownerEmail,
      hostName: studio.ownerName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await bookingCollection.insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Booking request sent! Waiting for host confirmation.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
});

// Protected: guest cancels their own Pending booking
router.patch("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id), userId: req.user.id, status: "Pending" },
      { $set: { status: "Cancelled", updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found, or it can no longer be cancelled.",
      });
    }

    res.json({ success: true, message: "Booking cancelled." });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel booking.",
    });
  }
});

// Protected: host updates status (Confirmed / Completed / Cancelled)
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!STATUSES.includes(status) || status === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const booking = await bookingCollection.findOne({
      _id: new ObjectId(id),
      hostId: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the host.",
      });
    }

    if (status === "Confirmed") {
      if (booking.status !== "Pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending bookings can be confirmed.",
        });
      }

      const conflict = await findConflict({
        studioId: booking.studioId,
        date: booking.date,
        startMinutes: booking.startMinutes,
        endMinutes: booking.endMinutes,
        excludeId: booking._id,
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Can't confirm: overlaps a confirmed booking (${conflict.startTime} - ${conflict.endTime}).`,
        });
      }
    }

    if (status === "Completed" && booking.status !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be completed.",
      });
    }

    await bookingCollection.updateOne(
      { _id: booking._id },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({ success: true, message: `Booking marked as ${status}.` });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update booking.",
    });
  }
});

export default router;