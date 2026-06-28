/**
 * Deterministic statistics for warehouse analytics (no LLM, no invented numbers).
 * Used to gate discoveries/correlations to statistically significant findings and
 * to compute reproducible confidence + trend slopes.
 */

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

/** Two-proportion z-test. Returns { z, confidence } where confidence = 1 − p (two-sided). */
export function twoPropTest(x1: number, n1: number, x2: number, n2: number): { z: number; confidence: number } {
  if (n1 <= 0 || n2 <= 0) return { z: 0, confidence: 0 }
  const p1 = x1 / n1, p2 = x2 / n2
  const p = (x1 + x2) / (n1 + n2)
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
  if (se === 0) return { z: 0, confidence: 0 }
  const z = (p1 - p2) / se
  const confidence = 2 * normalCdf(Math.abs(z)) - 1
  return { z, confidence }
}

/** Least-squares slope of y over evenly-indexed x (e.g., months). */
export function slope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xs = ys.map((_, i) => i)
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  return den === 0 ? 0 : num / den
}

/** Population standard deviation. */
export function stddev(ys: number[]): number {
  if (ys.length < 2) return 0
  const m = ys.reduce((a, b) => a + b, 0) / ys.length
  return Math.sqrt(ys.reduce((a, b) => a + (b - m) ** 2, 0) / ys.length)
}
