/**
 * Ink + exactOptionalPropertyTypes: only include color / backgroundColor when defined.
 */
export function inkFgBg(
  color?: string,
  backgroundColor?: string,
): { color?: string; backgroundColor?: string } {
  const o: { color?: string; backgroundColor?: string } = {};
  if (color !== undefined) o.color = color;
  if (backgroundColor !== undefined) o.backgroundColor = backgroundColor;
  return o;
}
