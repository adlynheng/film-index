import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_DERIVATION_CONTEXT = "owner-cookie";

export function constantTimeEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function deriveOwnerCookieValue(token: string): string {
  return createHmac("sha256", token).update(COOKIE_DERIVATION_CONTEXT).digest("hex");
}

export function isValidOwnerCookie(cookieValue: string, token: string): boolean {
  // Fail closed on a missing OWNER_TOKEN. HMAC accepts an empty key happily,
  // so without this an unconfigured deploy would accept the public constant
  // HMAC-SHA256(key="", "owner-cookie") as a valid owner cookie.
  if (token.length === 0) return false;
  const expectedCookieValue = deriveOwnerCookieValue(token);
  return constantTimeEquals(cookieValue, expectedCookieValue);
}
