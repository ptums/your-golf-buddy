// Single source of truth for URLs, price, and the content that also feeds
// structured data (JSON-LD). Keep copy here so the FAQ markup and the FAQPage
// schema never drift.

export const APP_URL = "https://app.yourbuddy.golf";
export const SITE_URL = "https://yourbuddy.golf";
export const CONTACT_EMAIL = "hello@yourbuddy.golf";

/** Stripe Payment Link — wired in phase 5. Falls back to the app for now. */
export const BUY_URL = APP_URL;

export const PRICE = 9;
export const PRICE_LABEL = "$9";

export const features: { title: string; body: string }[] = [
  {
    title: "Score in seconds",
    body: "Par, strokes, and putts per hole with two taps. Your running total and score-to-par update as you play.",
  },
  {
    title: "A note for every round",
    body: "Jot the wind, the greens, how the driver felt — whatever you'll want to remember next time you play there.",
  },
  {
    title: "Your whole history",
    body: "Every round you've logged, by course and score, so you can actually see your game trending.",
  },
  {
    title: "Works with no signal",
    body: "It's offline-first. Play a course in the middle of nowhere and everything still saves.",
  },
  {
    title: "Club-by-club practice",
    body: "Setup guidance and focused drills for each club — ball position, stance, and how to adjust for the lie.",
  },
  {
    title: "No account, no ads",
    body: "No email, no password, no sign-up wall. No trackers and nothing to sell. Just the app.",
  },
];

export const steps: { title: string; body: string }[] = [
  {
    title: "Set up your profile",
    body: "Pick a username and enter your date of birth. That's it — it just labels the data on your device. No email, no password.",
  },
  {
    title: "Add a course and play",
    body: "Type the course name (nearby courses are suggested), choose 9 or 18 holes, then log par, score, and putts as you go.",
  },
  {
    title: "Finish and review",
    body: "Add a note, save, and see your final score. The Games screen keeps every round so you can watch your progress.",
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes. The full app — scoring, notes, history, swing tips, and practice drills — is free and works on one device forever, with no ads and no account.",
  },
  {
    q: "What does the $9 Golf Buddy Pass add?",
    a: "A one-time $9 payment unlocks cloud sync: your rounds are backed up off your device and kept in step across your phone, tablet, and any other device you use. It's a single purchase, not a subscription — there's nothing to cancel.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Your Golf Buddy never asks for an email address or password. Your profile is just a username and a hashed date of birth stored on your device.",
  },
  {
    q: "Where is my data stored?",
    a: "On your device, in the browser's local storage. If you buy the Pass and turn on sync, a copy is also stored on our server — tied to a random key generated on your device, not to your name or email. You can delete all synced data from the app's settings at any time.",
  },
  {
    q: "How do I move to a new phone?",
    a: "The app gives you a recovery key you can save. Enter it on a new device to pull your rounds back. With the Golf Buddy Pass, sync handles this automatically.",
  },
  {
    q: "Does it work offline?",
    a: "Fully. The app is a Progressive Web App — install it to your home screen and it runs with no connection. Sync catches up whenever you're back online.",
  },
  {
    q: "Which devices does it work on?",
    a: "Any modern browser — iPhone, Android, or desktop. On iOS and Android you can add it to your home screen and it behaves like a normal app.",
  },
  {
    q: "Can I get a refund on the Pass?",
    a: "It's a digital purchase delivered immediately, so it's non-refundable except where the law requires otherwise. If sync isn't working for you, email us first and we'll fix it or refund you.",
  },
];
