/**
 * Animation Math Utilities
 * Simple Lerp and Easing functions for procedural animations
 * No external libraries - pure math
 */

/**
 * Linear Interpolation (Lerp)
 * @param a Start value
 * @param b End value
 * @param t Progress (0-1)
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Easing Functions
 * All functions take progress (0-1) and return eased progress (0-1)
 */

// Ease Out (smooth deceleration)
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Ease In (smooth acceleration)
export function easeIn(t: number): number {
  return t * t * t;
}

// Ease In-Out (smooth start and end)
export function easeInOut(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Elastic Easing (with overshoot)
export function easeElastic(t: number, amplitude: number = 1, period: number = 0.3): number {
  if (t === 0 || t === 1) return t;
  
  const s = period / 4;
  return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
}

// Bounce Easing
export function easeBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
}

/**
 * Smooth rotation towards target angle
 * Handles angle wrapping (0-360)
 */
export function lerpAngle(current: number, target: number, t: number): number {
  // Normalize angles to 0-360
  current = current % 360;
  target = target % 360;
  
  // Handle wrapping (shortest path)
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  return current + diff * t;
}

/**
 * Smooth scale animation with elastic bounce
 */
export function elasticScale(
  currentScale: number,
  targetScale: number,
  progress: number,
  amplitude: number = 0.3,
  period: number = 0.3
): number {
  const eased = easeElastic(progress, amplitude, period);
  return lerp(currentScale, targetScale, eased);
}
