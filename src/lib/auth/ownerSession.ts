import { isValidOwnerCookie } from "@/lib/auth/ownerToken";

export const OWNER_COOKIE_NAME = "owner";

export function isOwnerRequest(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const ownerUnlockToken = process.env.OWNER_UNLOCK_TOKEN;
  if (!ownerUnlockToken) return false;
  return isValidOwnerCookie(cookieValue, ownerUnlockToken);
}
