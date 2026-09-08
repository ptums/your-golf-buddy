# Your Golf Buddy — Mobile App

A thin native shell around the [web app](../../apps/web). It's an Expo / React
Native project whose only screen is a full-screen `WebView` pointed at the
deployed PWA (`https://ygb-web.peter-686.workers.dev`).

**Status:** ✅ Functional. The web app is already offline-first (service worker +
IndexedDB), so once it has loaded once it keeps working without a connection.

## Why a WebView

One codebase (the web app) drives every platform. The native wrapper adds: a home
screen icon, a splash screen, native geolocation prompts for the course
typeahead, Android hardware-back handling, and "open external links in the system
browser".

## Stack

| Concern   | Choice                            |
| --------- | ------------------------------- |
| Framework | Expo SDK 54, React Native 0.81  |
| Routing   | expo-router (one screen: `app/index.tsx`) |
| Web view  | `react-native-webview` 13.15    |
| Builds    | EAS Build (`eas.json`)          |

Not a pnpm workspace member — React Native / Metro needs its own hoisted
`node_modules`. Install with `npm install` from this directory.

## Develop

```bash
cd apps/mobile
npm install
npx expo start          # then press i (iOS sim) / a (Android) / scan QR with Expo Go
```

`react-native-webview` is bundled in Expo Go, so no custom dev build is needed
to run it.

The web URL comes from `app.json` → `expo.extra.webUrl`. Point it at a local
`pnpm --filter web dev` (use your machine's LAN IP, not `localhost`) to test
against unreleased web changes.

## Build & release

```bash
npm i -g eas-cli
eas login
eas init                 # writes expo.extra.eas.projectId into app.json
eas build --profile preview --platform android    # installable APK
eas build --profile production --platform all      # store builds
eas submit --platform ios      # / android
```

Profiles are in `eas.json` (`development` / `preview` / `production`).

## What the wrapper handles (`app/index.tsx`)

- Loading spinner on first load; a "Try again" screen if the initial load fails.
- Android hardware back → walks WebView history before exiting.
- Links to other hosts open in the system browser (`expo-web-browser`); the app
  host stays in the WebView.
- `geolocationEnabled` + iOS `NSLocationWhenInUseUsageDescription` + Android
  location permissions, so the course typeahead's "near me" ranking works.
- Pull-to-refresh (iOS).
- Web `console.*` and errors are bridged into the Metro logs.

## Follow-ups

- Icons are solid brand-orange placeholders (`assets/images/`). Swap in a real
  logo before shipping.
- Consider `expo-notifications` for a "you haven't logged a round in a while"
  nudge, and deep links (`yourgolfbuddy://`) into specific screens.
