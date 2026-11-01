import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectToMongoDB } from "./config/db.js";
import studioRoutes from "./routes/studioRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StudioSpace server is running!",
  });
});

app.use("/studios", studioRoutes);
app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);

// Start server
async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(PORT, () => {
      console.log(`StudioSpace server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();

export default app;