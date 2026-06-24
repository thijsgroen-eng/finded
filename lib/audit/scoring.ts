/**
 * Audit scoring — canonical import path for the deterministic, explained,
 * persisted score breakdown.
 *
 * The implementation lives in lib/engine/scoring.ts (already wired into the
 * pipeline and the report). It returns BOTH a final score and a per-component
 * explanation (mention frequency, position, model consensus, competitor gap,
 * website signal) plus a confidence/data-completeness score, renormalizing when
 * data is missing — never inventing it. Re-exported here (not duplicated) so new
 * code can import from lib/audit/* per the evidence-layer module layout.
 *
 * Note on weights: this v1 model uses six components (it additionally credits
 * prompt_coverage). The full formula + version is in the returned breakdown
 * (`formula`, `method_version`) and persisted to visibility_scores.score_breakdown.
 */

export {
  computeScoreBreakdown,
  positionScoreFromAvg,
  METHOD_VERSION,
  type ScoreInputs,
  type ScoreComponent,
  type ScoreBreakdown,
} from '@/lib/engine/scoring'
