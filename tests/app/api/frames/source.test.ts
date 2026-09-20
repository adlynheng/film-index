import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { deriveOwnerCookieValue } from "@/lib/auth/ownerToken";

const TEST_TOKEN = "test-unlock-token";
const FILM_ID = "9d538c7a-2950-4df8-b5f7-7755d694c8f9";

const getFilmFrameRef = vi.fn(async () => ({ slug: "a-film", posterKey: "frames/stored-key" }));
vi.mock("@/lib/db/films", () => ({ getFilmFrameRef }));

const { GET } = await import("@/app/api/frames/source/route");

function request(cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/frames/source?film=${FILM_ID}`, {
    headers: cookie === undefined ? {} : { cookie: `owner=${cookie}` },
  });
}

// This route hands back the bytes of a stored frame so the crop canvas stays
// same-origin. It is only ever opened by the owner's editor, and — since it
// reads whatever film id it is given — it must stay shut to everyone else.
describe("GET /api/frames/source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
  });

  it.each([
    ["no cookie", undefined],
    ["an empty cookie", ""],
    ["a forged cookie", "not-the-derived-value"],
    ["a cookie derived from a rotated-out token", deriveOwnerCookieValue("the-old-token")],
    ["the raw unlock token", TEST_TOKEN],
  ])("answers 403 to a caller with %s", async (_label, cookie) => {
    const response = await GET(request(cookie));
    expect(response.status).toBe(403);
    // Not even the film's existence leaks: the id is never looked up.
    expect(getFilmFrameRef).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 403 when the deploy has no unlock token configured", async () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", "");
    expect((await GET(request(deriveOwnerCookieValue("")))).status).toBe(403);
  });

  it("streams the stored frame back to the owner", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const response = await GET(request(deriveOwnerCookieValue(TEST_TOKEN)));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    // The editor must never be seeded from a cached copy of a frame the owner
    // has since replaced.
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain("frames/stored-key");
  });
});
