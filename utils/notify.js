import { db } from "../config/db.js";

const notificationCollection = db.collection("notifications");

export async function createNotification({ userId, type, message, bookingId, studioId }) {
  try {
    await notificationCollection.insertOne({
      userId,
      type,
      message,
      bookingId: bookingId ? String(bookingId) : null,
      studioId: studioId ? String(studioId) : null,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    // A failed notification must never break the booking flow
    console.error("Create notification error:", error);
  }
}