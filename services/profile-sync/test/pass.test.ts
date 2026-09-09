import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { flagOn, issuePass, verifyPass } from "../src/pass";
import { app } from "../src/index";

const SECRET = "test-pass-secret-0123456789";

describe("pass token", () => {
  it("round-trips issue -> verify", async () => {
    const token = await issuePass(SECRET, { kind: "sync", sid: "cs_test_123" });
    const payload = await verifyPass(SECRET, token);
    expect(payload).toMatchObject({ kind: "sync", sid: "cs_test_123" });
    expect(typeof payload?.iat).toBe("number");
  });

  it("rejects a tampered body", async () => {
    const token = await issuePass(SECRET, { kind: "sync" });
    const [, sig] = token.split(".");
    const forged = `${btoa('{"iat":0,"kind":"sync"}')
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")}.${sig}`;
    expect(await verifyPass(SECRET, forged)).toBeNull();
  });

  it("rejects the wrong secret, empty, and malformed input", async () => {
    const token = await issuePass(SECRET, { kind: "sync" });
    expect(await verifyPass("other-secret", token)).toBeNull();
    expect(await verifyPass(SECRET, "")).toBeNull();
    expect(await verifyPass(SECRET, "not-a-token")).toBeNull();
    expect(await verifyPass(undefined, token)).toBeNull();
  });

  it("flagOn only treats the string \"true\" as on", () => {
    expect(flagOn("true")).toBe(true);
    expect(flagOn("false")).toBe(false);
    expect(flagOn(undefined)).toBe(false);
    expect(flagOn("1")).toBe(false);
  });
});

describe("POST /pass/claim", () => {
  it("is 404 while the feature is dark (PASS_ENABLED=false)", async () => {
    expect(env.PASS_ENABLED).toBe("false");
    const res = await app.request(
      "/pass/claim",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_test_abc" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });
});
