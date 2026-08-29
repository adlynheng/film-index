import { NextRequest, NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb/client";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  // A throw here (missing key, TMDB down, rate limit) would return an HTML
  // error page, and the search hook parses every response as JSON — so a
  // transient TMDB failure would surface as a JSON parse error in the modal
  // rather than an empty result list.
  try {
    const results = await searchTmdb(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("TMDB search failed:", error);
    return NextResponse.json({ results: [], error: "Search is unavailable right now." }, { status: 502 });
  }
}
