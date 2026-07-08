/**
 * The single piece of mutable state shared between the DOM layer (ui.js)
 * and the WebGL layer (helix.js). UI writes, helix reads.
 */
export const state = {
  /** 0..1 progress down the page */
  scroll: 0,

  /** Accent the current section wants, as 0-255 RGB */
  accentTarget: { r: 0x35, g: 0xe0, b: 0xd4 },

  reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  mobile: window.matchMedia('(max-width: 700px)').matches,

  /** Set true when WebGL never starts, so ui.js drives --accent itself */
  noWebGL: false,
};

export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
