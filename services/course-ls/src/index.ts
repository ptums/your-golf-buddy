import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { CourseService } from "./services/CourseService";
import { CacheService } from "./services/CacheService";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const cacheService = new CacheService();
const courseService = new CourseService(cacheService);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "course-location-service",
  });
});

// Main course endpoint
app.get("/courses", async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        error: "Missing required parameters: lat and lng",
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string);
    const resultLimit = parseInt(limit as string);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: "Invalid coordinates provided",
      });
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        error: "Coordinates out of valid range",
      });
    }

    // Get courses
    const result = await courseService.getCourses({
      lat: latitude,
      lng: longitude,
      radius: searchRadius,
      limit: resultLimit,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Course Location Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🏌️  Courses endpoint: http://localhost:${PORT}/courses?lat=40.7128&lng=-74.0060`
  );
});
