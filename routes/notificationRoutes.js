import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
const notificationCollection = db.collection("notifications");

// Latest 20 notifications + total unread count
router.get("/", verifyToken, async (req, res) => {
  try {
    const [data, unreadCount] = await Promise.all([
      notificationCollection
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      notificationCollection.countDocuments({ userId: req.user.id, read: false }),
    ]);
    res.json({ success: true, data, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
});

// Mark all as read (must be declared BEFORE "/:id/read")
router.patch("/read-all", verifyToken, async (req, res) => {
  try {
    await notificationCollection.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update notifications." });
  }
});

// Mark one as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID." });
    }
    await notificationCollection.updateOne(
      { _id: new ObjectId(req.params.id), userId: req.user.id },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
});

export default router;