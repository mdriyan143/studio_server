import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const wishlistCollection = db.collection("wishlist");
const studioCollection = db.collection("studios");

// Protected: ids of studios I saved (used for the heart icons)
router.get("/ids", verifyToken, async (req, res) => {
  try {
    const items = await wishlistCollection
      .find({ userId: req.user.id })
      .toArray();
    res.json({ success: true, data: items.map((i) => i.studioId) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load wishlist." });
  }
});

// Protected: full studio documents I saved
router.get("/", verifyToken, async (req, res) => {
  try {
    const items = await wishlistCollection
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    const ids = items
      .filter((i) => ObjectId.isValid(i.studioId))
      .map((i) => new ObjectId(i.studioId));

    const studios = await studioCollection.find({ _id: { $in: ids } }).toArray();
    res.json({ success: true, data: studios });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load saved studios." });
  }
});

// Protected: save a studio
router.post("/:studioId", verifyToken, async (req, res) => {
  try {
    const { studioId } = req.params;
    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({ success: false, message: "Invalid studio ID." });
    }

    const studio = await studioCollection.findOne({ _id: new ObjectId(studioId) });
    if (!studio) {
      return res.status(404).json({ success: false, message: "Studio not found." });
    }

    await wishlistCollection.updateOne(
      { userId: req.user.id, studioId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    res.status(201).json({ success: true, message: "Saved to wishlist." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save studio." });
  }
});

// Protected: remove a saved studio
router.delete("/:studioId", verifyToken, async (req, res) => {
  try {
    await wishlistCollection.deleteOne({
      userId: req.user.id,
      studioId: req.params.studioId,
    });
    res.json({ success: true, message: "Removed from wishlist." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove studio." });
  }
});

export default router;