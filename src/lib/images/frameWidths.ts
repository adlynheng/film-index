/**
 * Deliberately free of any dependency — `sharp` in particular. `buildFilmImage`
 * in r2.ts needs these widths and is called from a Client Component, so if this
 * lived alongside the resizing code the whole native image pipeline would be
 * pulled into the browser bundle and the build would fail on `fs`. Keep this
 * module a plain constant.
 *
 * Rungs chosen against measured render widths (Task 16): grid tiles occupy
 * 427-452 CSS px on desktop and ~310 on a phone, and `object-cover` scales a
 * 2.40:1 frame by height so it renders ~1.35x wider than its box. 720 exists
 * for 1x desktop, which needs ~576px and would otherwise round up to 960 —
 * more bytes than the single 680 variant this ladder replaced. 1280 is the
 * ceiling because that is the source width.
 */
export const FRAME_WIDTHS = [480, 720, 960, 1280] as const;
export type FrameWidth = (typeof FRAME_WIDTHS)[number];
