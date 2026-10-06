/** A press that moves less than this is a tap, not a roll or a scroll. Shared
 *  by the globe (a tap on a marker) and the stage (a tap stops the replay);
 *  its own module so the stage can read it without importing the lazy
 *  canvas chunk. */
export const TAP_SLOP_PX = 6;
