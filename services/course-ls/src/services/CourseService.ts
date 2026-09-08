import {
  Course,
  CourseSummary,
  CourseRequest,
  CourseResponse,
  ExternalCourseAPIResponse,
} from "../types";
import { CacheService } from "./CacheService";
import axios from "axios";

export class CourseService {
  private cacheService: CacheService;
  private readonly EXTERNAL_API_URL =
    process.env.EXTERNAL_API_URL || "https://api.example.com/courses";

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  /**
   * Main method to get courses for a location
   */
  async getCourses(request: CourseRequest): Promise<CourseResponse> {
    const { lat, lng, radius = 10, limit = 20 } = request;

    // Check cache first
    const cachedCourses = await this.cacheService.getCachedCourses(
      lat,
      lng,
      radius
    );

    if (cachedCourses) {
      return {
        courses: cachedCourses.slice(0, limit),
        cached: true,
        timestamp: Date.now(),
      };
    }

    // Fetch from external API
    const courses = await this.fetchFromExternalAPI(lat, lng, radius);

    // Convert to minimal format and calculate distances
    const courseSummaries = this.convertToSummaries(courses, lat, lng);

    // Cache the results
    await this.cacheService.setCachedCourses(lat, lng, radius, courseSummaries);

    return {
      courses: courseSummaries.slice(0, limit),
      cached: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Fetch courses from external API
   * TODO: Replace with your actual external API
   */
  private async fetchFromExternalAPI(
    lat: number,
    lng: number,
    radius: number
  ): Promise<Course[]> {
    try {
      console.log(`🌐 Fetching courses from external API for ${lat}, ${lng}`);

      // For now, return mock data - replace with actual API call
      const mockCourses: Course[] = [
        {
          id: "1",
          name: "Pebble Beach Golf Links",
          holes: 18,
          par: 72,
          yardage: 6828,
          location: {
            lat: lat + 0.01,
            lng: lng + 0.01,
            address: "1700 17-Mile Drive, Pebble Beach, CA",
          },
          rating: 4.8,
          price: 575,
        },
        {
          id: "2",
          name: "Augusta National Golf Club",
          holes: 18,
          par: 72,
          yardage: 7475,
          location: {
            lat: lat - 0.01,
            lng: lng - 0.01,
            address: "2604 Washington Rd, Augusta, GA",
          },
          rating: 4.9,
          price: 500,
        },
        {
          id: "3",
          name: "St Andrews Old Course",
          holes: 18,
          par: 72,
          yardage: 6721,
          location: {
            lat: lat + 0.02,
            lng: lng - 0.02,
            address: "St Andrews, Fife, Scotland",
          },
          rating: 4.7,
          price: 300,
        },
      ];

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return mockCourses;
    } catch (error) {
      console.error("Error fetching from external API:", error);
      throw new Error("Failed to fetch course data from external API");
    }
  }

  /**
   * Convert full course data to minimal summary format
   */
  private convertToSummaries(
    courses: Course[],
    userLat: number,
    userLng: number
  ): CourseSummary[] {
    return courses
      .map((course) => ({
        id: course.id,
        name: course.name,
        holes: course.holes,
        par: course.par,
        yardage: course.yardage,
        distance: this.calculateDistance(
          userLat,
          userLng,
          course.location.lat,
          course.location.lng
        ),
      }))
      .sort((a, b) => a.distance - b.distance); // Sort by distance
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
