import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeFullMetrics } from '../lib/engine/metrics-v2'
import { computeScoreBreakdown } from '../lib/engine/scoring'
import { aggregateCompetitors } from '../lib/audit/competitors'
import { normalizeName } from '../lib/engine/normalize'
import { currentAlgoVersions } from '../lib/versions'

/**
 * Golden-dataset regression tests (#6).
 *
 * Each fixture in tests/golden/fixtures freezes the *parsed evidence* of an audit
 * (mentions + extracted entities — what model_runs.parsed_response stores) and the
 * deterministic outputs it should produce. The runner replays the deterministic
 * chain (metrics → score → competitors) with NO network/LLM calls and asserts the
 * outputs are unchanged.
 *
 * Why parsed evidence, not raw responses: entity extraction itself is an LLM step
 * and isn't deterministic, so the golden boundary starts *after* extraction — at
 * exactly the algorithms we version (scoring/benchmark/aggregation).
 *
 * Intentional algorithm change? Re-baseline with:  GOLDEN_UPDATE=1 npm test
 * That rewrites each fixture's `expected` + `versions`. Review the diff before
 * committing — it is the record of what your change did to every benchmark case.
 */

const FIX_DIR = join(__dirname, 'golden', 'fixtures')
const UPDATE = process.env.GOLDEN_UPDATE === '1'

interface Fixture {
  name: string
  target: string
  providersRan: number
  completionRate: number
  authorityScore: number | null
  websiteSignals: { present: number; total: number } | null
  mentions: any[]
  entities: any[]
  expected: null | {
    visibility_score: number
    confidence_score: number
    model_consensus: number
    mention_frequency: number
    top_competitor: string | null
  }
  versions?: Record<string, string>
}

/** Run the deterministic chain a fixture's evidence flows through in the pipeline. */
function compute(fx: Fixture) {
  const metrics = computeFullMetrics(fx.target, fx.mentions, fx.entities)
  const breakdown = computeScoreBreakdown({
    mentionFrequency: metrics.mention_frequency,
    modelConsensus: metrics.model_consensus,
    providersRan: Math.max(1, fx.providersRan),
    shareOfVoice: metrics.share_of_voice,
    authorityScore: fx.authorityScore,
    websiteSignals: fx.websiteSignals,
    sampleCount: metrics.sample_count,
    completionRate: fx.completionRate,
  })
  const competitors = aggregateCompetitors(
    fx.entities.map((e) => ({
      name: e.name, model: e.model, prompt_id: e.prompt_id, position: e.position,
      sentiment: e.sentiment, is_target: normalizeName(e.name) === normalizeName(fx.target),
      normalized_name: normalizeName(e.name), evidence_excerpt: null, context: null,
    })),
    fx.target,
  )
  return {
    visibility_score: round(breakdown.visibility_score, 2),
    confidence_score: round(breakdown.confidence_score, 4),
    model_consensus: metrics.model_consensus,
    mention_frequency: round(metrics.mention_frequency, 4),
    top_competitor: competitors[0]?.name ?? null,
  }
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

const files = readdirSync(FIX_DIR).filter((f) => f.endsWith('.json'))
assert.ok(files.length > 0, 'no golden fixtures found')

for (const file of files) {
  const path = join(FIX_DIR, file)
  const fx = JSON.parse(readFileSync(path, 'utf8')) as Fixture

  test(`golden: ${fx.name}`, () => {
    const actual = compute(fx)

    if (UPDATE || fx.expected == null) {
      const updated = { ...fx, expected: actual, versions: currentAlgoVersions() }
      writeFileSync(path, JSON.stringify(updated, null, 2) + '\n')
      if (!UPDATE) {
        assert.fail(`Fixture "${fx.name}" had no baseline; wrote one. Re-run to verify, then commit ${file}.`)
      }
      return
    }

    // Exact for integers, tight tolerance for floats — a real algorithm change
    // moves these and must be re-baselined deliberately via GOLDEN_UPDATE.
    assert.equal(actual.model_consensus, fx.expected.model_consensus, 'model_consensus')
    assert.equal(actual.top_competitor, fx.expected.top_competitor, 'top_competitor')
    assert.ok(Math.abs(actual.visibility_score - fx.expected.visibility_score) <= 0.5,
      `visibility_score ${actual.visibility_score} vs ${fx.expected.visibility_score}`)
    assert.ok(Math.abs(actual.confidence_score - fx.expected.confidence_score) <= 0.01,
      `confidence_score ${actual.confidence_score} vs ${fx.expected.confidence_score}`)
    assert.ok(Math.abs(actual.mention_frequency - fx.expected.mention_frequency) <= 0.001,
      `mention_frequency ${actual.mention_frequency} vs ${fx.expected.mention_frequency}`)
  })
}
