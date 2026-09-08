// Core course data structure
export interface Course {
  id: string;
  name: string;
  holes: number;
  par: number;
  yardage: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  rating?: number;
  price?: number;
}

// Minimal response for fast delivery
export interface CourseSummary {
  id: string;
  name: string;
  holes: number;
  par: number;
  yardage: number;
  distance: number; // Distance from user location in miles
}

// Location-based cache key
export interface LocationKey {
  lat: number;
  lng: number;
  radius: number; // Search radius in miles
}

// API request/response types
export interface CourseRequest {
  lat: number;
  lng: number;
  radius?: number; // Default 10 miles
  limit?: number; // Default 20 courses
}

export interface CourseResponse {
  courses: CourseSummary[];
  cached: boolean;
  timestamp: number;
}

// External API response (this will depend on your actual API)
export interface ExternalCourseAPIResponse {
  courses: Course[];
  total: number;
  page: number;
}
