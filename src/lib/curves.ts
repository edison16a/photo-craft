/**
 * Smooth curves through points, the same way Konva draws a Line with
 * tension, so the SVG preview of a custom shape matches the canvas.
 * Konva runs a Catmull-Rom spline through the corners; this builds the
 * equivalent cubic Bezier path.
 */

interface Point {
  x: number;
  y: number;
}

function toPoints(flat: number[]): Point[] {
  const points: Point[] = [];
  for (let index = 0; index + 1 < flat.length; index += 2) points.push({ x: flat[index], y: flat[index + 1] });
  return points;
}

/**
 * The two Bezier control points around the middle of three points, as
 * Konva computes them: each sits along the line between the neighbours,
 * pulled towards its own side in proportion to the distances.
 */
function controlPoints(before: Point, at: Point, after: Point, tension: number): [Point, Point] {
  const d01 = Math.hypot(at.x - before.x, at.y - before.y);
  const d12 = Math.hypot(after.x - at.x, after.y - at.y);
  const total = d01 + d12 || 1;
  const fa = (tension * d01) / total;
  const fb = (tension * d12) / total;
  return [
    { x: at.x - fa * (after.x - before.x), y: at.y - fa * (after.y - before.y) },
    { x: at.x + fb * (after.x - before.x), y: at.y + fb * (after.y - before.y) },
  ];
}

function fmt(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * SVG path through the points. With tension 0 the sides are straight.
 * With tension above 0 the path curves smoothly through every corner,
 * looping around when closed. Fewer than two points give an empty string.
 */
export function smoothPath(flat: number[], closed: boolean, tension: number): string {
  const points = toPoints(flat);
  if (points.length < 2) return "";
  if (tension <= 0 || points.length < 3) {
    const straight = points.map((point, index) => `${index === 0 ? "M" : "L"} ${fmt(point.x)} ${fmt(point.y)}`);
    return straight.join(" ") + (closed ? " Z" : "");
  }
  const count = points.length;
  const pick = (index: number) => points[((index % count) + count) % count];
  // Control points on both sides of every corner. Open paths keep their
  // ends as they are, so the first and last corners get none.
  const controls: [Point, Point][] = points.map((point, index) => {
    if (!closed && (index === 0 || index === count - 1)) return [point, point];
    return controlPoints(pick(index - 1), point, pick(index + 1), tension);
  });
  const commands = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`];
  const segments = closed ? count : count - 1;
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % count;
    const c1 = controls[index][1];
    const c2 = controls[next][0];
    const end = points[next];
    commands.push(`C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(end.x)} ${fmt(end.y)}`);
  }
  if (closed) commands.push("Z");
  return commands.join(" ");
}
