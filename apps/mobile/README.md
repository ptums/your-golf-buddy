# Your Golf Buddy — Mobile App

An Expo / React Native client intended to become the native counterpart of the
[Your Golf Buddy web app](../../apps/web).

**Status:** 🔴 Scaffold only — not started. This is still the stock
`create-expo-app` template (home/explore tabs, themed components, parallax
demo screens). The only Golf Buddy-specific addition is an empty
`app/(tabs)/game/index.tsx`. No score tracking, profiles, or sync yet.

It now lives in the monorepo but is **not a pnpm workspace member** — React
Native / Metro needs its own hoisted `node_modules`, so it keeps its own
`package-lock.json` and is installed with `npm install` from this directory.
The intent (see `../../docs/features.md`) is to port the web app's features into
React Native and share `@ygb/shared` types with the web client.

## Tech stack

| Concern     | Choice                                              |
| ----------- | ------------------------------------------------- |
| Framework   | Expo SDK ~54, React Native 0.81, React 19         |
| Routing     | `expo-router` v6 (file-based, typed routes on)    |
| Navigation  | React Navigation v7 (bottom tabs)                 |
| Language    | TypeScript ~5.9                                   |
| Arch        | New Architecture enabled; React Compiler experiment on |
| Lint        | `eslint-config-expo`                              |

## Getting started

```bash
npm install
npx expo start        # then press i / a / w, or scan the QR with Expo Go
```

| Script              | What it does                     |
| ------------------- | ------------------------------- |
| `npm start`         | `expo start`                    |
| `npm run ios`       | Open in iOS simulator           |
| `npm run android`   | Open in Android emulator        |
| `npm run web`       | Run as a web build              |
| `npm run lint`      | `expo lint`                     |
| `npm run reset-project` | Move the starter code to `app-example/` and start a blank `app/` |

## Project layout

```
app/
  _layout.tsx            Root stack (tabs + modal)
  modal.tsx              Demo modal screen
  (tabs)/
    _layout.tsx          Bottom tab bar
    index.tsx            "Home" — template content
    explore.tsx          "Explore" — template content
    game/index.tsx       Empty — placeholder for the scorecard feature
components/              Themed text/view, parallax scroll, haptic tab, icons
constants/theme.ts       Colors + fonts
hooks/                   use-color-scheme, use-theme-color
```

## Next steps

1. Add it to the pnpm workspace (or keep standalone) and pull in `@ygb/shared`.
2. Build the profile + round-tracking screens (mirror `apps/web/lib/db.ts`).
3. Wire sync to the [profile-sync](../../services/profile-sync) service.
4. Strip the leftover template screens (`explore`, `modal`, parallax demo).
