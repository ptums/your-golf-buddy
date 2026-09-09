import type { APIRoute } from "astro";
import {
  APP_URL,
  SITE_URL,
  PRICE_LABEL,
  PASS_ENABLED,
  features,
  steps,
  faqs,
} from "../data/site";

const pricingSection = PASS_ENABLED
  ? `## Pricing

The app is free on a single device with no time limit and no feature gate other
than sync. A one-time ${PRICE_LABEL} purchase — the "Golf Buddy Pass" — unlocks cloud
sync and backup across all your devices. It is a single payment, not a
subscription; there is nothing to cancel. The Pass is delivered as a key you
enter in the app's settings; it is not tied to an account.

Payments are processed by Stripe. Because the Pass is a digital good delivered
immediately, it is non-refundable except where required by law.`
  : `## Pricing

The app is free, with no ads and no account. Cloud sync (optional) backs up your
rounds and keeps them in step across devices.`;

const body = `# Your Golf Buddy — full description

Your Golf Buddy is a free, offline-first golf scorecard and notes app for
recreational golfers who want to track their rounds without signing up for
anything. It runs in the browser and installs to a phone home screen as a
Progressive Web App.

## What it does

${features.map((f) => `- ${f.title}: ${f.body}`).join("\n")}

## How it works

${steps.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join("\n")}

## Privacy

There are no user accounts. The app never asks for an email address or password.
A profile is just a username and a hashed date of birth, stored in the browser on
your device. The marketing site (${SITE_URL}) is static, sets no cookies, and runs
no analytics or third-party trackers.

If you enable sync, a copy of your rounds is stored on the app's server so you can
use them on another device. That data is associated with a random identifier
generated on your device — not with your name, email, or any personal
information. You can delete all synced data from the app's settings at any time.

${pricingSection}

## Moving devices

The app shows a recovery key you can save. Entering it on a new device restores
your rounds.${PASS_ENABLED ? " With the Golf Buddy Pass, sync does this automatically." : ""}

## FAQ

${faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}

## Links

- App: ${APP_URL}
- Home: ${SITE_URL}
- Privacy: ${SITE_URL}/privacy
- Terms: ${SITE_URL}/terms
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
