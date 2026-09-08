import { Course, CourseSummary, LocationKey } from "../types";

export class CacheService {
  private memoryCache: Map<string, CourseSummary[]> = new Map();
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  /**
   * Generate a cache key based on location coordinates
   * Rounds coordinates to ~100m precision for better cache hits
   */
  private generateLocationKey(
    lat: number,
    lng: number,
    radius: number
  ): string {
    // Round to ~100m precision (0.001 degrees ≈ 100m)
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    return `${roundedLat}_${roundedLng}_${radius}`;
  }

  /**
   * Check if we have cached data for this location
   */
  async getCachedCourses(
    lat: number,
    lng: number,
    radius: number
  ): Promise<CourseSummary[] | null> {
    const key = this.generateLocationKey(lat, lng, radius);
    const cached = this.memoryCache.get(key);

    if (cached) {
      console.log(`🎯 Cache HIT for location: ${lat}, ${lng}`);
      return cached;
    }

    console.log(`❌ Cache MISS for location: ${lat}, ${lng}`);
    return null;
  }

  /**
   * Cache course data for a specific location
   */
  async setCachedCourses(
    lat: number,
    lng: number,
    radius: number,
    courses: CourseSummary[]
  ): Promise<void> {
    const key = this.generateLocationKey(lat, lng, radius);
    this.memoryCache.set(key, courses);

    console.log(
      `💾 Cached ${courses.length} courses for location: ${lat}, ${lng}`
    );

    // Set TTL - in production, you'd use Redis with proper TTL
    setTimeout(() => {
      this.memoryCache.delete(key);
      console.log(`🗑️  Cache expired for location: ${lat}, ${lng}`);
    }, this.CACHE_TTL * 1000);
  }

  /**
   * Clear all cached data (useful for testing)
   */
  clearCache(): void {
    this.memoryCache.clear();
    console.log("🧹 Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}
