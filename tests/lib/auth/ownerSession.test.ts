import { afterEach, describe, expect, it, vi } from "vitest";
import { isOwnerRequest } from "@/lib/auth/ownerSession";
import { deriveOwnerCookieValue } from "@/lib/auth/ownerToken";

const TEST_TOKEN = "test-unlock-token";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isOwnerRequest", () => {
  it("accepts a cookie derived from the configured token", () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    expect(isOwnerRequest(deriveOwnerCookieValue(TEST_TOKEN))).toBe(true);
  });

  it("rejects a missing cookie", () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    expect(isOwnerRequest(undefined)).toBe(false);
  });

  it("rejects an empty cookie", () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    expect(isOwnerRequest("")).toBe(false);
  });

  it("rejects a cookie derived from a stale token after rotation", () => {
    const staleCookie = deriveOwnerCookieValue("the-old-token");
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    expect(isOwnerRequest(staleCookie)).toBe(false);
  });

  it("rejects the raw token presented as a cookie", () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    expect(isOwnerRequest(TEST_TOKEN)).toBe(false);
  });

  // A deploy with no OWNER_UNLOCK_TOKEN must lock everyone out, not let
  // everyone in — see the empty-key note in ownerToken.ts.
  it("rejects every cookie when the token is unset", () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", "");
    expect(isOwnerRequest(deriveOwnerCookieValue(""))).toBe(false);
    expect(isOwnerRequest("anything")).toBe(false);
  });
});
