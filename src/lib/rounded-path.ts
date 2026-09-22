/**
 * Polygons with rounded corners, as SVG path data. Each corner is cut back
 * along both sides and joined with a circular arc, the way a rounded
 * rectangle's corners are, so a drawn logo or a preset polygon can have
 * soft corners of any radius. Both the canvas (Konva.Path) and the SVG
 * preview draw from the same string.
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

function fmt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** The two tangent points and true radius of the fillet at one corner, or null when it cannot be rounded. */
function fillet(prev: Point, corner: Point, next: Point, radius: number): { a: Point; b: Point; r: number; sweep: 0 | 1 } | null {
  const v1 = { x: prev.x - corner.x, y: prev.y - corner.y };
  const v2 = { x: next.x - corner.x, y: next.y - corner.y };
  const d1 = Math.hypot(v1.x, v1.y);
  const d2 = Math.hypot(v2.x, v2.y);
  if (d1 === 0 || d2 === 0 || radius <= 0) return null;
  const u1 = { x: v1.x / d1, y: v1.y / d1 };
  const u2 = { x: v2.x / d2, y: v2.y / d2 };
  const cosine = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
  const angle = Math.acos(cosine);
  // A straight run or a spike has no corner to round.
  if (angle > Math.PI - 0.001 || angle < 0.001) return null;
  const half = Math.tan(angle / 2);
  // Cut back no further than halfway along either side, so neighbouring corners never overlap.
  const cut = Math.min(radius / half, d1 / 2, d2 / 2);
  const r = cut * half;
  const cross = u1.x * u2.y - u1.y * u2.x;
  return {
    a: { x: corner.x + u1.x * cut, y: corner.y + u1.y * cut },
    b: { x: corner.x + u2.x * cut, y: corner.y + u2.y * cut },
    r,
    // Travelling in along the first side and out along the second, a turn to
    // the right on screen is a clockwise arc, which SVG calls sweep 1.
    sweep: cross < 0 ? 1 : 0,
  };
}

/**
 * SVG path through the flat [x0, y0, x1, y1, ...] points with every corner
 * rounded by up to radius pixels. A closed path rounds every corner and
 * ends with Z; an open one keeps its two ends sharp. Radius 0 gives plain
 * straight sides. Fewer than two points give an empty string.
 */
export function roundedPolygonPath(flat: number[], radius: number, closed: boolean): string {
  const points = toPoints(flat);
  const count = points.length;
  if (count < 2) return "";
  const at = (index: number) => points[((index % count) + count) % count];
  const commands: string[] = [];
  const corner = (index: number, first: boolean) => {
    const point = points[index];
    const rounded = fillet(at(index - 1), point, at(index + 1), radius);
    if (!rounded) {
      commands.push(`${first ? "M" : "L"} ${fmt(point.x)} ${fmt(point.y)}`);
      return;
    }
    commands.push(`${first ? "M" : "L"} ${fmt(rounded.a.x)} ${fmt(rounded.a.y)}`);
    commands.push(`A ${fmt(rounded.r)} ${fmt(rounded.r)} 0 0 ${rounded.sweep} ${fmt(rounded.b.x)} ${fmt(rounded.b.y)}`);
  };
  if (closed) {
    for (let index = 0; index < count; index += 1) corner(index, index === 0);
    commands.push("Z");
  } else {
    commands.push(`M ${fmt(points[0].x)} ${fmt(points[0].y)}`);
    for (let index = 1; index < count - 1; index += 1) corner(index, false);
    commands.push(`L ${fmt(points[count - 1].x)} ${fmt(points[count - 1].y)}`);
  }
  // A closed path that started on an arc's first tangent point ends back
  // there through its last L, which is what Z needs.
  return commands.join(" ");
}
