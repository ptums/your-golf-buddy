# Your Golf Buddy — Mobile App

An Expo / React Native client intended to become the native counterpart of the
[Your Golf Buddy web app](../web).

**Status:** 🔴 Scaffold only — not started. This is still the stock
`create-expo-app` template (home/explore tabs, themed components, parallax
demo screens). The only Golf Buddy-specific addition is an empty
`app/(tabs)/game/index.tsx`. No score tracking, profiles, or sync yet. The repo
has one commit ("Initial commit") and no remote.

The intent (from `../docs/features.md` and `../notes/08-16-2025.md`) is to port
the web app's features into React Native, likely inside a Turborepo monorepo
shared with the web client.

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

1. Decide on the monorepo move (share types/DB logic with `../web`).
2. Build the profile + round-tracking screens (mirror `web/lib/db.ts`).
3. Wire sync to the [Profile Sync](../profile-sync) service.
4. Strip the leftover template screens (`explore`, `modal`, parallax demo).
