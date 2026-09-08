import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override: this app has no ISR / cached routes — every
// page is a client component over IndexedDB.
export default defineCloudflareConfig();
