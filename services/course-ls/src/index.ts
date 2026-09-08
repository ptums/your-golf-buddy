import { Hono } from "hono";
import { cors } from "hono/cors";
import { CacheService } from "./services/CacheService";
import { CourseService } from "./services/CourseService";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Services hold only in-memory state; on Workers that state is per-isolate and
// short-lived. Fine for the mock prototype — a real deployment needs Workers KV
// or the Cache API (see README).
const cacheService = new CacheService();
const courseService = new CourseService(cacheService);

app.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "course-location-service",
  }),
);

app.get("/courses", async (c) => {
  const { lat, lng, radius, limit } = c.req.query();

  if (!lat || !lng) {
    return c.json({ error: "Missing required parameters: lat and lng" }, 400);
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);
  const searchRadius = radius ? Number.parseInt(radius, 10) : 10;
  const resultLimit = limit ? Number.parseInt(limit, 10) : 20;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return c.json({ error: "Invalid coordinates provided" }, 400);
  }
  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return c.json({ error: "Coordinates out of valid range" }, 400);
  }

  const result = await courseService.getCourses({
    lat: latitude,
    lng: longitude,
    radius: searchRadius,
    limit: resultLimit,
  });
  return c.json(result);
});

app.onError((err, c) => {
  console.error("course-ls error:", err);
  return c.json(
    {
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    },
    500,
  );
});

export default app;
