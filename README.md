# Score Card and Notes

An offline‑first Progressive Web App (PWA) for tracking golf rounds, built with Next.js, Preact, Tailwind CSS, Dexie (IndexedDB), and TanStack Virtual for performant list virtualization.

## Features

- **Phone‑number login**: First‑time users enter their mobile number; returning users auto‑redirect to courses.

- **Course management**: Create new courses (9‑ or 18‑hole) with a simple form.

- **Game listing**: View all past games, showing course name & date.

- **Hole‑by‑hole score entry**:

  - Per‑hole cards are virtualized for performance
  - Tap to activate Par/Score inputs; auto‑advance from Par→Score after 1 s
  - Select a 5‑level rating via colored buttons
  - Data persists in IndexedDB and survives page reloads

- **Offline‑capable PWA**:
  - Uses next-pwa + service worker for asset caching
  - System‑UI font stack for zero‑delay rendering

## Tech Stack

- Framework: Next.js 13 (App Router)

- View Layer: Preact (via preact/compat)

- Styling: Tailwind CSS

- Local Storage: Dexie (IndexedDB)

- List Virtualization: @tanstack/react-virtual

- PWA: next-pwa for service worker & manifest

## Getting Started

1. Clone the repo

```
git clone https://github.com/your-org/score-card-and-notes.git
cd score-card-and-notes
```

2. Install dependencies

```
npm install
Run in development
```

3. Run in development

```
npm run dev
# Visit http://localhost:3000
```

4. Build & start production

```
npm run build
npm run start
# PWA assets generated in /public
```

## Project Structure

```.
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home (PhoneNumberInput)
│   ├── games/
│   │   └── page.tsx          # GamesPage listing
│   └── game/
│       └── [courseId]/
│           └── page.tsx      # GameEntryPage (virtualized cards)
├── components/               # Reusable UI components
│   ├── PhoneNumberInput.tsx
│   └── GamesPage.tsx
├── services/                 # Dexie DB setup & migration
│   └── db.ts                 # IndexedDB schema & migration
├── styles/
│   └── globals.css           # Tailwind imports & base styles
├── public/
│   ├── manifest.json         # PWA manifest
│   └── icons/                # PWA icons
├── tailwind.config.js        # Tailwind configuration
├── next.config.js            # Next.js + Preact + PWA settings
└── package.json
```

## Database Schema (Dexie v2)

```
// User
{ id, account: string }

// Course
{ id, name: string, rounds: 9 | 18 }

// Game
{ id, date: Date, courseId: number, userId: number, finalNote: string, finalScore }

// Score
{ id, gameId: number, hole: number, par: string, score: string, rating: 0–4 }
```

- Scores are keyed by gameId + hole so entries persist and reload correctly.

## TO DO:

- Working on offline capabilities
- Set up download page
- Set up payment page
- 404/500 hundred error contact form page
- Set up CCM flags (payment page & deployment page)
- Deploy
