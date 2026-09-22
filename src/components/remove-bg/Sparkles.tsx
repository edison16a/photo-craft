"use client";
import { useMemo } from "react";

interface SparklesProps {
  /** Same seed, same star layout, so a re-render does not shuffle them. */
  seed: string;
  count?: number;
}

interface Star {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

/** A small deterministic random source from a string. */
function makeRandom(seed: string): () => number {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** A four point star centred in a 24 by 24 box. */
const STAR_PATH = "M12 0C12.6 6.5 17.5 11.4 24 12C17.5 12.6 12.6 17.5 12 24C11.4 17.5 6.5 12.6 0 12C6.5 11.4 11.4 6.5 12 0Z";

/** Blue stars that turn, fade in and fade out over a picture being worked on. */
export function Sparkles({ seed, count = 14 }: SparklesProps) {
  const stars = useMemo<Star[]>(() => {
    const random = makeRandom(seed);
    return Array.from({ length: count }, () => ({
      left: 4 + random() * 92,
      top: 4 + random() * 92,
      size: 10 + random() * 24,
      duration: 1.4 + random() * 1.4,
      // A negative delay starts each star part way through its cycle.
      delay: -random() * 2.8,
    }));
  }, [seed, count]);

  return (
    <div className="sparkles" aria-hidden="true">
      {stars.map((star, index) => (
        <svg
          key={index}
          className="sparkle"
          viewBox="0 0 24 24"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}
