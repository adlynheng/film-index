import { describe, expect, it } from "vitest";
import { constantTimeEquals, deriveOwnerCookieValue, isValidOwnerCookie } from "@/lib/auth/ownerToken";

describe("constantTimeEquals", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEquals("secret-token", "secret-token")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEquals("secret-token", "secret-tokEn")).toBe(false);
  });

  it("returns false for strings of different lengths", () => {
    expect(constantTimeEquals("short", "much-longer-string")).toBe(false);
  });
});

describe("deriveOwnerCookieValue", () => {
  it("is deterministic for the same token", () => {
    expect(deriveOwnerCookieValue("token-a")).toBe(deriveOwnerCookieValue("token-a"));
  });

  it("differs for different tokens", () => {
    expect(deriveOwnerCookieValue("token-a")).not.toBe(deriveOwnerCookieValue("token-b"));
  });

  it("never returns the raw token itself", () => {
    expect(deriveOwnerCookieValue("token-a")).not.toBe("token-a");
  });
});

describe("isValidOwnerCookie", () => {
  it("validates a cookie derived from the matching token", () => {
    const cookieValue = deriveOwnerCookieValue("the-real-token");
    expect(isValidOwnerCookie(cookieValue, "the-real-token")).toBe(true);
  });

  it("rejects a cookie derived from a different token", () => {
    const cookieValue = deriveOwnerCookieValue("the-real-token");
    expect(isValidOwnerCookie(cookieValue, "a-rotated-token")).toBe(false);
  });

  it("rejects a raw token used directly as a cookie value", () => {
    expect(isValidOwnerCookie("the-real-token", "the-real-token")).toBe(false);
  });

  // A deploy that forgets to set OWNER_TOKEN must fail closed. Without this,
  // the derived value is HMAC-SHA256(key="", "owner-cookie") — a public
  // constant anyone can compute and present as an owner cookie.
  it("rejects every cookie when the token is empty", () => {
    expect(isValidOwnerCookie(deriveOwnerCookieValue(""), "")).toBe(false);
    expect(isValidOwnerCookie("", "")).toBe(false);
  });
});
