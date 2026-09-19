import { NextRequest, NextResponse } from "next/server";
import { constantTimeEquals, deriveOwnerCookieValue } from "@/lib/auth/ownerToken";
import { OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const providedToken = request.nextUrl.searchParams.get("token");
  const ownerUnlockToken = process.env.OWNER_UNLOCK_TOKEN;

  if (!providedToken || !ownerUnlockToken || !constantTimeEquals(providedToken, ownerUnlockToken)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(OWNER_COOKIE_NAME, deriveOwnerCookieValue(ownerUnlockToken), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_IN_SECONDS,
    path: "/",
  });
  return response;
}
