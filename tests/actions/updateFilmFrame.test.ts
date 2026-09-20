import { beforeEach, describe, expect, it, vi } from "vitest";
import { deriveOwnerCookieValue } from "@/lib/auth/ownerToken";

const TEST_TOKEN = "test-unlock-token";

const cookieValue = vi.fn<() => string | undefined>(() => undefined);
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "owner" ? { value: cookieValue() } : undefined) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getFilmFrameRef = vi.fn(async () => ({ slug: "a-film", posterKey: "frames/old-key" }));
const updateFilmPosterKey = vi.fn(async (_filmId: string, _posterKey: string | null) => {});
vi.mock("@/lib/db/films", () => ({ getFilmFrameRef, updateFilmPosterKey }));

const uploadFilmFrame = vi.fn(async () => {});
const deleteFilmFrames = vi.fn(async () => {});
vi.mock("@/lib/images/r2", () => ({ uploadFilmFrame, deleteFilmFrames }));

const resizeFilmFrame = vi.fn(async () => [{ width: 480 as const, buffer: Buffer.alloc(1) }]);
vi.mock("@/lib/images/resize", () => ({ resizeFilmFrame }));

const { updateFilmFrame } = await import("@/actions/updateFilmFrame");

const FILM_ID = "9d538c7a-2950-4df8-b5f7-7755d694c8f9";

// A Server Action is a public POST endpoint: rendering the editor for the owner
// alone is not the boundary, the cookie check inside the action is. These lock
// that check in place — a frame must never be rewritten or deleted without it.
describe("updateFilmFrame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OWNER_UNLOCK_TOKEN", TEST_TOKEN);
    cookieValue.mockReturnValue(undefined);
  });

  it.each([
    ["no cookie", undefined],
    ["an empty cookie", ""],
    ["a forged cookie", "not-the-derived-value"],
    ["a cookie derived from a rotated-out token", deriveOwnerCookieValue("the-old-token")],
    ["the raw unlock token", TEST_TOKEN],
  ])("refuses a caller with %s", async (_label, value) => {
    cookieValue.mockReturnValue(value);
    await expect(updateFilmFrame({ filmId: FILM_ID, frameImageBytes: new ArrayBuffer(8) })).rejects.toThrow(
      /not authorized/i,
    );
  });

  it("refuses before reading, writing, uploading or deleting anything", async () => {
    await expect(updateFilmFrame({ filmId: FILM_ID, frameImageBytes: new ArrayBuffer(8) })).rejects.toThrow();
    expect(getFilmFrameRef).not.toHaveBeenCalled();
    expect(updateFilmPosterKey).not.toHaveBeenCalled();
    expect(uploadFilmFrame).not.toHaveBeenCalled();
    expect(deleteFilmFrames).not.toHaveBeenCalled();
  });

  // Clearing a frame is the destructive half of the same action, and it takes
  // no image bytes — so nothing else in the call could stop an unauthorized one.
  it("refuses to clear a frame for an unauthorized caller", async () => {
    await expect(updateFilmFrame({ filmId: FILM_ID, frameImageBytes: null })).rejects.toThrow(/not authorized/i);
    expect(updateFilmPosterKey).not.toHaveBeenCalled();
    expect(deleteFilmFrames).not.toHaveBeenCalled();
  });

  it("refuses everyone when the deploy has no unlock token configured", async () => {
    vi.stubEnv("OWNER_UNLOCK_TOKEN", "");
    cookieValue.mockReturnValue(deriveOwnerCookieValue(""));
    await expect(updateFilmFrame({ filmId: FILM_ID, frameImageBytes: null })).rejects.toThrow(/not authorized/i);
    expect(updateFilmPosterKey).not.toHaveBeenCalled();
  });

  it("writes the new key, then deletes the old one, for the owner", async () => {
    cookieValue.mockReturnValue(deriveOwnerCookieValue(TEST_TOKEN));
    await updateFilmFrame({ filmId: FILM_ID, frameImageBytes: new ArrayBuffer(8) });

    expect(uploadFilmFrame).toHaveBeenCalledTimes(1);
    const [, newKey] = updateFilmPosterKey.mock.calls[0]!;
    expect(newKey).toMatch(new RegExp(`^frames/${FILM_ID}-[0-9a-f]{8}$`));
    expect(deleteFilmFrames).toHaveBeenCalledWith("frames/old-key");
    expect(updateFilmPosterKey.mock.invocationCallOrder[0]!).toBeLessThan(
      deleteFilmFrames.mock.invocationCallOrder[0]!,
    );
  });
});
