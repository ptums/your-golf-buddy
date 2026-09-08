# Hybrid Authentication System

This document explains how the hybrid authentication system works in Your Golf Buddy app.

## Overview

The hybrid authentication system allows the app to work both online (with Clerk) and offline (with local storage), providing a seamless user experience regardless of network connectivity.

## How It Works

### 1. Online Mode (Clerk)

- When the user is online and has no offline session, Clerk handles authentication
- User signs in through Clerk's secure authentication flow
- Clerk provides user ID and email for the session
- All data is associated with the Clerk user ID

### 2. Offline Mode (Local Storage)

- When the user is offline or chooses offline mode, local authentication is used
- User provides email address for offline identification
- A unique offline user ID is generated and stored in localStorage
- Session expires after 90 days for security
- All data is stored locally with the offline user ID

### 3. Seamless Switching

- The system automatically detects online/offline status
- Users can switch between modes without losing data
- When coming back online, offline data can be synced (future feature)

## Components

### Core Files

- `lib/hybridAuth.ts` - Main authentication logic and hooks
- `components/HybridAuthGuard.tsx` - Authentication guard for protected routes
- `components/HybridClerkProvider.tsx` - Conditionally loads Clerk
- `components/OfflineStatus.tsx` - Shows offline status to users

### Database Changes

- Added `userId` field to `Course`, `Game`, and `Score` tables
- Database version 5 includes user tracking
- Helper functions to add user ID to data automatically

## User Experience

### Online Users

1. Visit the app
2. Sign in through Clerk
3. Use all features normally
4. Data syncs automatically

### Offline Users

1. Visit the app while offline
2. See offline sign-in form
3. Enter email address
4. Continue using the app with local data storage
5. See offline indicator in header

### Switching Modes

- **Online → Offline**: App continues working, shows offline indicator
- **Offline → Online**: App detects connection, can sync data (future)

## Security Features

- Offline sessions expire after 90 days
- User IDs are unique and non-guessable
- Local storage is cleared on sign out
- No sensitive data stored in localStorage

## Testing

Visit `/test-hybrid` to see:

- Current authentication status
- User information
- Online/offline status
- Database user ID

## Future Enhancements

1. **Data Sync**: Sync offline data when coming back online
2. **Conflict Resolution**: Handle data conflicts between offline and online versions
3. **Progressive Enhancement**: Add more offline features
4. **Push Notifications**: Notify users when coming back online

## Implementation Notes

- Clerk is only loaded when needed (conditional loading)
- Offline mode works without any external dependencies
- All existing functionality preserved
- Backward compatible with existing data

## Troubleshooting

### Common Issues

1. **Offline mode not working**: Check if localStorage is available
2. **Clerk not loading**: Verify internet connection and Clerk configuration
3. **User ID not showing**: Check database version and user authentication state

### Debug Steps

1. Check browser console for errors
2. Visit `/test-hybrid` page
3. Verify localStorage contents
4. Check network tab for failed requests
