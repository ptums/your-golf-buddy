import type { APIRoute } from "astro";
import { APP_URL, SITE_URL, PRICE_LABEL, PASS_ENABLED } from "../data/site";

const pricing = PASS_ENABLED
  ? `- Free to use on one device, forever. No sign-up.
- Optional one-time ${PRICE_LABEL} purchase (not a subscription) unlocks cross-device cloud sync.
- Cloud data is tied to a random device-generated key, never to a name or email.`
  : `- Free to use, no sign-up, no ads.
- Optional cloud sync (backs up your rounds and syncs across devices), tied to a random device-generated key — never a name or email.`;

const body = `# Your Golf Buddy

> Your Golf Buddy is a free, offline-first golf scorecard and notes app. Track par,
> score, and putts hole by hole, keep a note on every round, and review your history.
> There are no accounts, no email, no ads, and no trackers — your data lives on your
> device.${PASS_ENABLED ? ` A one-time ${PRICE_LABEL} "Golf Buddy Pass" adds cloud sync and backup across devices.` : ""}

## Key facts

${pricing}
- Works fully offline (installable Progressive Web App).
- Data is stored locally; nothing is collected about you.
- Recovery key lets you move to a new device.

## Links

- App: ${APP_URL}
- Home / marketing: ${SITE_URL}
- FAQ: ${SITE_URL}/#faq
- Privacy: ${SITE_URL}/privacy
- Terms: ${SITE_URL}/terms
- Full description for LLMs: ${SITE_URL}/llms-full.txt
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
