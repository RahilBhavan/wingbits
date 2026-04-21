/** Clamp n into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Keep scrollTop so selectedIndex stays inside the viewport window.
 */
export function ensureScroll(
  selectedIndex: number,
  scrollTop: number,
  viewport: number,
  total: number,
): number {
  if (total <= 0) return 0;
  const maxScroll = Math.max(0, total - viewport);
  let next = scrollTop;
  if (selectedIndex < next) next = selectedIndex;
  if (selectedIndex >= next + viewport) next = selectedIndex - viewport + 1;
  return clamp(next, 0, maxScroll);
}
