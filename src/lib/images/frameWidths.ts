/**
 * Deliberately free of any dependency — `sharp` in particular. `buildFilmImage`
 * in r2.ts needs these widths and is called from a Client Component, so if this
 * lived alongside the resizing code the whole native image pipeline would be
 * pulled into the browser bundle and the build would fail on `fs`. Keep this
 * module a plain constant.
 *
 * The small rungs are sized against the grid (Task 16): tiles occupy 427-452
 * CSS px on desktop and ~310 on a phone, and `object-cover` scales a 2.40:1
 * frame by height so it renders ~1.35x wider than its box. 720 exists for 1x
 * desktop, which needs ~576px and would otherwise round up to 960 — more bytes
 * than the single 680 variant this ladder replaced.
 *
 * The large rungs are sized against the detail hero, measured at 968 CSS px on
 * a 1440 viewport, which is 1936 device px at 2x. 1920 covers that for a 16:9
 * still. A wider still is cropped by `object-cover` to roughly 76% of its own
 * width in that 16:9 box, so a scope frame needs ~2560 stored to put a real
 * pixel under each of those 1936 — at 1280 the hero was upscaling 2x.
 */
export const FRAME_WIDTHS = [480, 720, 960, 1280, 1920, 2560] as const;
export type FrameWidth = (typeof FRAME_WIDTHS)[number];
