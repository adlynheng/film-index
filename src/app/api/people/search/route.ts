import { NextRequest, NextResponse } from "next/server";
import { isOwnerRequest, OWNER_COOKIE_NAME } from "@/lib/auth/ownerSession";
import { searchPeopleByName } from "@/lib/db/people";

const MIN_QUERY_LENGTH = 2;

/**
 * Names already in the index, for the add-title dialog's cast comboboxes.
 *
 * Owner-only: the route exists solely for a dialog only the owner can open, so
 * it is gated like the write path rather than left open because the names
 * happen to be public on /actors.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isOwnerRequest(request.cookies.get(OWNER_COOKIE_NAME)?.value)) {
    return NextResponse.json({ results: [] }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  // Shaped like the TMDB route: a database hiccup answers with an `error` the
  // field can show, rather than an HTML error page the JSON parse would choke
  // on mid-keystroke.
  try {
    const results = await searchPeopleByName(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("People search failed:", error);
    return NextResponse.json({ results: [], error: "Name lookup is unavailable right now." }, { status: 502 });
  }
}
