/**
 * Algorithm version registry — the backbone of reproducibility.
 *
 * Every audit permanently records the version of each deterministic algorithm
 * that produced it (see `audits.algo_versions`, migration 024). Bump the relevant
 * constant *whenever you change that algorithm's behaviour*, so:
 *   - historical audits remain explainable ("this score used scoring v2"),
 *   - golden-dataset tests (tests/golden) can detect regressions per algorithm,
 *   - the Observation Engine can segment trends by methodology.
 *
 * These are intentionally plain strings, not derived from anything. Treat a bump
 * as a deliberate act with a changelog entry below.
 *
 * Changelog:
 *   scoring        v2  — weighted breakdown with renormalisation (lib/engine/scoring.ts)
 *   parser         v1  — tolerant recommendation/JSON parsing
 *   extraction     v1  — Claude-Haiku entity extraction + keyword fallback
 *   recommendation v1  — evidence-backed, benchmark-gated recommendations
 *   benchmark      v1  — Observation Engine benchmarks + pattern lift
 */

import { METHOD_VERSION } from '@/lib/engine/scoring'

export const SCORING_VERSION = METHOD_VERSION // 'v2' — single source of truth
export const PARSER_VERSION = 'v1'
export const EXTRACTION_VERSION = 'v1'
export const RECOMMENDATION_VERSION = 'v1'
export const BENCHMARK_VERSION = 'v1'

export interface AlgoVersions {
  scoring: string
  parser: string
  extraction: string
  recommendation: string
  benchmark: string
}

/** The current version of every algorithm, stamped onto each audit at run time. */
export function currentAlgoVersions(): AlgoVersions {
  return {
    scoring: SCORING_VERSION,
    parser: PARSER_VERSION,
    extraction: EXTRACTION_VERSION,
    recommendation: RECOMMENDATION_VERSION,
    benchmark: BENCHMARK_VERSION,
  }
}

/** Versions assumed for audits created before the registry existed. */
export const LEGACY_ALGO_VERSIONS: AlgoVersions = {
  scoring: 'v2', // method_version was already 'v2' in score_breakdown
  parser: 'v0',
  extraction: 'v0',
  recommendation: 'v0',
  benchmark: 'v0',
}
