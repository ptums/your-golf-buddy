"use client";

import { useState } from "react";

export default function APIDocsPage() {
  const [activeTab, setActiveTab] = useState("users");

  const apiDocs = {
    games: {
      title: "Games API",
      description: "Manage golf game data and statistics",
      endpoints: [
        {
          method: "GET",
          path: "/api/games?action=count",
          description: "Get total game count",
          response: '{ "count": 25 }',
        },
        {
          method: "GET",
          path: "/api/games?action=all",
          description: "Get all games",
          response: '{ "games": [...] }',
        },
        {
          method: "GET",
          path: "/api/games?action=with-courses",
          description: "Get all games with course information populated",
          response:
            '{ "games": [{ "id": 1, "courseId": 1, "course": { "id": 1, "name": "Pebble Beach", "rounds": 18 }, ... }] }',
        },
        {
          method: "GET",
          path: "/api/games?action=by-id&id=1",
          description: "Get game by ID",
          response: '{ "game": {...} }',
        },
        {
          method: "GET",
          path: "/api/games?action=by-user&userId=user-id",
          description: "Get games by user ID",
          response: '{ "games": [...] }',
        },
        {
          method: "GET",
          path: "/api/games?action=recent&limit=5",
          description: "Get recent games",
          response: '{ "games": [...] }',
        },
        {
          method: "GET",
          path: "/api/games?action=stats",
          description: "Get game statistics",
          response:
            '{ "totalGames": 25, "averageScore": 85.2, "courseStats": {...} }',
        },
        {
          method: "POST",
          path: "/api/games",
          description: "Create new game",
          body: '{ "action": "create", "courseId": 1, "date": "2024-01-15", "finalScore": 82, "finalNote": "Great round!" }',
          response: '{ "id": 26 }',
        },
        {
          method: "POST",
          path: "/api/games",
          description: "Update game",
          body: '{ "action": "update", "id": 1, "finalScore": 80 }',
          response: '{ "success": true }',
        },
        {
          method: "POST",
          path: "/api/games",
          description: "Delete game",
          body: '{ "action": "delete", "id": 1 }',
          response: '{ "success": true }',
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-slate-600">
            Access your golf data programmatically through these REST API
            endpoints
          </p>
        </div>

        {/* API Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-lg border-2 border-amber-200">
            {Object.keys(apiDocs).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-orange-600 text-white shadow-lg"
                    : "text-slate-600 hover:text-slate-800 hover:bg-amber-50"
                }`}
              >
                {apiDocs[tab as keyof typeof apiDocs]?.title}
              </button>
            ))}
          </div>
        </div>

        {/* API Content */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {apiDocs[activeTab as keyof typeof apiDocs]?.title}
            </h2>
            <p className="text-slate-600">
              {apiDocs[activeTab as keyof typeof apiDocs]?.description}
            </p>
          </div>

          <div className="space-y-6">
            {apiDocs[activeTab as keyof typeof apiDocs]?.endpoints.map(
              (endpoint, index) => (
                <div
                  key={index}
                  className="border-2 border-amber-200 rounded-lg p-6 bg-amber-50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold ${
                        endpoint.method === "GET"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="bg-white px-3 py-1 rounded border font-mono text-sm">
                      {endpoint.path}
                    </code>
                  </div>

                  <p className="text-slate-700 mb-3">{endpoint.description}</p>

                  {endpoint.body && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        Request Body:
                      </p>
                      <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                        {endpoint.body}
                      </pre>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">
                      Response:
                    </p>
                    <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                      {endpoint.response}
                    </pre>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">
            Usage Examples
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700">JavaScript/Fetch</h4>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                {`// Get user count
  const response = await fetch('/api/users?action=count');
  const data = await response.json();
  console.log('Total users:', data.count);

  // Create new user
  const userResponse = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      email: 'golfer@example.com',
      password: 'password123',
      name: 'John Golfer'
    })
  });
  const userData = await userResponse.json();

  // Get games with course information
  const gamesResponse = await fetch('/api/games?action=with-courses');
  const gamesData = await gamesResponse.json();
  console.log('Games with courses:', gamesData.games);`}
              </pre>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700">cURL</h4>
              <pre className="bg-slate-100 p-4 rounded text-sm overflow-x-auto">
                {`# Get all games
curl "/api/games?action=all"

# Export data as CSV
curl "/api/export?format=csv" -o golf-data.csv

# Get game statistics
curl "/api/games?action=stats"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">
            Security & Privacy
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • All API endpoints are protected and require authentication
            </li>
            <li>
              • Password hashes are never exposed in responses (unless
              explicitly requested for migration)
            </li>
            <li>
              • User data is isolated - users can only access their own
              information
            </li>
            <li>
              • All data is stored locally in your browser&apos;s IndexedDB
            </li>
            <li>• No data is sent to external servers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
