/**
 * Thins out a freehand stroke so a drawn shape keeps its look without a
 * corner for every pixel the pointer crossed. Ramer-Douglas-Peucker: keep
 * the ends, find the point furthest from the line between them, and keep
 * it too when it sticks out more than the tolerance, then repeat on both
 * halves.
 */

/** Distance from a point to the line through two others, or to the nearer end when they coincide. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Returns the flat [x0, y0, x1, y1, ...] list with points closer than
 * tolerance to the simplified line dropped. Two points or fewer come back
 * as they are.
 */
export function simplifyPoints(points: number[], tolerance: number): number[] {
  const count = Math.floor(points.length / 2);
  if (count <= 2) return points.slice(0, count * 2);
  const keep = new Array<boolean>(count).fill(false);
  keep[0] = true;
  keep[count - 1] = true;
  const stack: [number, number][] = [[0, count - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    let furthest = 0;
    let index = -1;
    for (let candidate = first + 1; candidate < last; candidate += 1) {
      const distance = distanceToSegment(
        points[candidate * 2],
        points[candidate * 2 + 1],
        points[first * 2],
        points[first * 2 + 1],
        points[last * 2],
        points[last * 2 + 1],
      );
      if (distance > furthest) {
        furthest = distance;
        index = candidate;
      }
    }
    if (index !== -1 && furthest > tolerance) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  const result: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (keep[index]) result.push(points[index * 2], points[index * 2 + 1]);
  }
  return result;
}
