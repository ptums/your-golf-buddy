# Probile Sync

# Web

# Course Location Serivice (Course LS)

## Prompts & Responses

P: So maybe if I describe the project more you can help me determine what best fits the project in terms of programming language.

This is a wrapper BE service for an API that will pull course (number of holes, par yardage, etc.) data and make it accessible quickly and delivered the FE in minimal data. This an offline app and when the user comes back online it will look at the users location if its stored in cache do not fetch course data. Also if the user is in the same location cache the full results on a server near the user's location. I want simple and minimal straight foward interact with the FE. I want to deliver small amounts of data very quickly to the user and the disconnect immediately.

R: Go (GoLang) - Perfect Fit
Why Go is ideal for your use case:
Performance & Efficiency
Ultra-fast startup - perfect for "connect, deliver, disconnect" pattern
Minimal memory footprint - great for caching scenarios
Excellent concurrency - handle multiple location requests efficiently
Single binary deployment - no runtime dependencies
Caching & Location Logic
Built-in map types - perfect for location-based caching
Fast JSON marshaling/unmarshaling - minimal data delivery
Excellent for geospatial calculations - distance, proximity checks
Memory-efficient - can cache large datasets without bloat

Deployment & Cost
Tiny Docker images - 10-20MB vs 100MB+ for other languages
Runs on minimal resources - $5/month VPS easily handles this
Fast cold starts - important for serverless if you go that route
Architecture Suggestion

┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Frontend │───▶│ Course Service │───▶│ External API │
│ (Your App) │ │ (Go) │ │ (Course Data) │
└─────────────────┘ └──────────────────┘ └─────────────────┘
│
▼
┌──────────────────┐
│ Redis Cache │
│ (Location + │
│ Course Data) │
└──────────────────┘

Key Features to Implement
Location-based caching - Cache by GPS coordinates (rounded to ~100m)
Minimal response format - Only essential course data
Fast lookup - In-memory maps for instant responses
Background refresh - Update cache when external API is available
Sample Go Structure
type CourseService struct {
cache map[string]CourseData
api ExternalCourseAPI
}

func (s \*CourseService) GetCourses(lat, lng float64) []Course {
// Check cache first
// If miss, fetch from API
// Cache and return minimal data
}
Would you like me to help you set up the initial Go project structure for this service?
