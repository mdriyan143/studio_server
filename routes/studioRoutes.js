import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const studioCollection = db.collection("studios");

function validateStudioBody(body) {
  const {
    title,
    category,
    hourlyRate,
    securityDeposit,
    maxCapacity,
    location,
    imageUrl,
    overview,
  } = body;

  if (
    !title ||
    !category ||
    hourlyRate == null ||
    securityDeposit == null ||
    maxCapacity == null ||
    !location ||
    !imageUrl ||
    !overview
  ) {
    return { error: "Please provide all required studio information." };
  }

  const rate = Number(hourlyRate);
  const deposit = Number(securityDeposit);
  const capacity = Number(maxCapacity);

  if (
    !Number.isFinite(rate) ||
    !Number.isFinite(deposit) ||
    !Number.isInteger(capacity) ||
    rate < 0 ||
    deposit < 0 ||
    capacity < 1
  ) {
    return { error: "Please provide valid pricing and capacity values." };
  }

  return { rate, deposit, capacity };
}

// Keeps only http(s) links, removes duplicates, max 8 gallery images
function cleanGallery(gallery) {
  if (!Array.isArray(gallery)) return [];
  const urls = gallery
    .filter((u) => typeof u === "string" && /^https?:\/\/.+/i.test(u.trim()))
    .map((u) => u.trim());
  return [...new Set(urls)].slice(0, 8);
}

// Get all studios (Public) — supports ?limit=6&category=Photo Studio&search=loft
router.get("/", async (req, res) => {
  try {
    const { limit, category, search, ownerId } = req.query;

    const filter = {};

    if (typeof ownerId === "string" && ownerId.trim()) {
      filter.ownerId = ownerId.trim();
    }

    if (typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }
    if (typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
      ];
    }

    let cursor = studioCollection.find(filter).sort({ createdAt: -1 });

    const max = Number(limit);
    if (Number.isInteger(max) && max > 0) cursor = cursor.limit(max);

    const studios = await cursor.toArray();

    res.json({ success: true, data: studios });
  } catch (error) {
    console.error("List studios error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch studios.",
    });
  }
});

// Get user's studios (Protected) — must stay above "/:id"
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const studios = await studioCollection
      .find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: studios });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your studios.",
    });
  }
});

// Get one studio (Public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const studio = await studioCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    res.json({ success: true, data: studio });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch studio.",
    });
  }
});

// Add a studio (Protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const checked = validateStudioBody(req.body);
    if (checked.error) {
      return res.status(400).json({ success: false, message: checked.error });
    }

    const { title, category, location, imageUrl, amenities, overview, gallery } =
      req.body;

    const studioData = {
      title: title.trim(),
      category,
      hourlyRate: checked.rate,
      securityDeposit: checked.deposit,
      maxCapacity: checked.capacity,
      location,
      imageUrl,
      amenities: Array.isArray(amenities) ? amenities : [],
      gallery: cleanGallery(gallery),
      overview,
      ownerId: req.user.id,
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      ownerImage: req.user.image,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await studioCollection.insertOne(studioData);

    res.status(201).json({
      success: true,
      message: "Studio added successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Add studio error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add studio.",
    });
  }
});

// Update a studio (Protected + Owner only)
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const checked = validateStudioBody(req.body);
    if (checked.error) {
      return res.status(400).json({ success: false, message: checked.error });
    }

    const { title, category, location, imageUrl, amenities, overview, gallery } =
      req.body;

    const result = await studioCollection.updateOne(
      { _id: new ObjectId(id), ownerId: req.user.id },
      {
        $set: {
          title: title.trim(),
          category,
          hourlyRate: checked.rate,
          securityDeposit: checked.deposit,
          maxCapacity: checked.capacity,
          location,
          imageUrl,
          amenities: Array.isArray(amenities) ? amenities : [],
          gallery: cleanGallery(gallery),
          overview,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner.",
      });
    }

    res.json({ success: true, message: "Studio updated successfully!" });
  } catch (error) {
    console.error("Update studio error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update studio.",
    });
  }
});

// Delete a studio (Protected + Owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const result = await studioCollection.deleteOne({
      _id: new ObjectId(id),
      ownerId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner.",
      });
    }

    res.json({ success: true, message: "Studio deleted successfully!" });
  } catch (error) {
    console.error("Delete studio error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete studio.",
    });
  }
});

export default router;