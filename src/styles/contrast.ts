/**
 * WCAG 2.x contrast math, shared by every test that asserts a colour pairing.
 *
 * The palette tests read resolved values out of `tailwind.css` rather than
 * sampling rendered pixels, so these functions are the only place the relative
 * luminance formula lives. Adding a second copy is how two tests end up
 * disagreeing about whether a pairing passes.
 */

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
