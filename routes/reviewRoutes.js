import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const reviewCollection = db.collection("reviews");
const studioCollection = db.collection("studios");
const bookingCollection = db.collection("bookings");

// Public: reviews for a studio (newest first)
router.get("/studio/:studioId", async (req, res) => {
  try {
    const { studioId } = req.params;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const reviews = await reviewCollection
      .find({ studioId }, { projection: { userId: 0 } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
});

// Protected: add a review (needs a Completed booking, one review per studio)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { studioId, rating, comment } = req.body;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "Please choose a rating from 1 to 5.",
      });
    }

    const text = typeof comment === "string" ? comment.trim() : "";
    if (text.length < 10 || text.length > 600) {
      return res.status(400).json({
        success: false,
        message: "Your review must be between 10 and 600 characters.",
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
        message: "You can't review your own studio.",
      });
    }

    const completed = await bookingCollection.findOne({
      studioId,
      userId: req.user.id,
      status: "Completed",
    });

    if (!completed) {
      return res.status(403).json({
        success: false,
        message: "You can review a studio after completing a booking there.",
      });
    }

    const existing = await reviewCollection.findOne({
      studioId,
      userId: req.user.id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You've already reviewed this studio.",
      });
    }

    await reviewCollection.insertOne({
      studioId,
      userId: req.user.id,
      userName: req.user.name,
      userImage: req.user.image,
      rating: stars,
      comment: text,
      createdAt: new Date(),
    });

    // Recalculate the studio's average rating and review count
    const [stats] = await reviewCollection
      .aggregate([
        { $match: { studioId } },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    await studioCollection.updateOne(
      { _id: new ObjectId(studioId) },
      {
        $set: {
          rating: Math.round(stats.average * 10) / 10,
          reviewCount: stats.count,
        },
      }
    );

    res.status(201).json({
      success: true,
      message: "Thanks! Your review has been posted.",
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to post review.",
    });
  }
});

export default router;