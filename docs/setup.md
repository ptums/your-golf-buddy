0. Decide your posture (10 min)
   • Closed-source product? Make repo private; only ship compiled/minified artifacts.
   • Open parts? Keep client UI open if you want, but keep the value (models, content, APIs) server-side and private.

1. Lock down your repo (1–2 hrs)
   • Make the GitHub repo private (or split public/private).
   • Add .gitignore and scrub history for secrets (rotate anything ever committed).
   • Enable 2FA and require it for collaborators.
   • Turn on branch protection, required reviews, and Dependabot + secret scanning.
   • Add SECURITY.md (how to report vulns) and CODEOWNERS.
   • Generate an SBOM (CycloneDX) so you know what you ship.

2. Secrets & environments (1–2 hrs)
   • Move all API keys to a secrets manager (GitHub Encrypted Secrets, 1Password, Doppler, etc.).
   • Separate dev/staging/prod projects, keys, and databases.
   • Rotate any leaked tokens. Use least privilege keys (read-only where possible).

3. Choose a license (15–30 min)
   • If closed, no public license—just keep it private and add “All rights reserved” notices.
   • If you open any code, pick a clear OSS license (MIT/Apache-2.0 for permissive; AGPL if you want network copiers to share back).

4. Own your brand (1–2 hrs + filings)
   • Register the domain you’ll actually market.
   • Do a quick trademark search on the app name/logo; if it’s clean, file a basic word mark when you can.
   • Add ™ now; switch to ® if/when approved.
   • Put © [Year] [Your Name/Company] on the site/app.

5. Company + basic contracts (half day)
   • Form an LLC (keeps personal assets separate).
   • If anyone helped: get IP assignment (they assign all work to the company).
   • For testers/contractors: short NDA + work-for-hire clause.

6. Terms of Service & Privacy Policy (1–2 hrs)
   • Draft lightweight ToS (acceptable use, no scraping, rate limits, “as-is”, liability cap).
   • Draft Privacy Policy (what you collect, why, retention, deletion request process, 3rd parties).
   • If you have EU/California users: add GDPR/CCPA rights and a DPA with key vendors.
   • Add cookie/analytics disclosure if you use them.
   • Link ToS/PP in footer and signup screen; require checkbox for creating an account.

7. App hardening (half day)
   • Auth: use a hosted auth (e.g., OAuth/OIDC) and email verification.
   • Transport: force HTTPS, enable HSTS.
   • Headers: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
   • Input: server-side validation everywhere; sanitize outputs (XSS).
   • Rate limits + basic bot protection (per-IP and per-account).
   • Admin surface behind SSO + IP allowlist if possible.

8. Data governance (1–2 hrs)
   • Map what you store (users, rounds, scores). Keep PII minimal.
   • Set retention (e.g., delete inactive accounts after 12 months).
   • Encrypt at rest (DB default) + in transit (TLS).
   • Daily offsite backups, tested restore.
   • Access logs for admin/data exports.

9. 3rd-party services sanity check (1 hr)
   • List every vendor (hosting, auth, email, analytics, payments).
   • Verify roles/permissions, billing limits, and security settings.
   • Sign DPAs where relevant; turn on audit logs if offered.

10. Monitoring & incident basics (1–2 hrs)
    • Uptime monitor (health check).
    • Error tracking (client + server).
    • Structured logs with request IDs.
    • Write a 1-page incident playbook: who does what, how to notify users, how to roll back.

11. Safer sharing while you test
    • Use invite codes or a waitlist.
    • Tag builds as “Beta”, watermark screenshots, and include no-resale/no-scrape language in ToS.
    • If you share the code for review, use private GitHub access with read-only permissions and an NDA.

12. IP strategy (optional but good)
    • Your code is automatically copyrighted when you write it.
    • If you have a truly novel algorithm/tech, consider a provisional patent (12-month placeholder) before public disclosure.
    • Otherwise, keep the “secret sauce” as a trade secret (only on the server, access-controlled, logged).
