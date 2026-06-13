/**
 * Signal Gap Engine
 * 
 * Detects the external signals that actually determine AI recommendation probability.
 * Checks citation sources, directories, knowledge graphs, forums, and review platforms.
 * 
 * This is NOT SEO. This models what LLMs learn from during training.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type GapType =
  | 'no_knowledge_graph'        // Not in Wikipedia/Wikidata
  | 'missing_directory'         // Not in key directories AI trains on
  | 'low_review_volume'         // Fewer reviews than category benchmark
  | 'no_reddit_presence'        // No Reddit discussions found
  | 'no_press_citations'        // No press/media mentions detected
  | 'no_external_citations'     // Barely mentioned outside own website
  | 'stale_signals'             // Last external mention is old
  | 'weak_intent_language'      // Wrong terminology for target intents
  | 'missing_schema'            // No structured data on website
  | 'no_faq_content'            // No FAQ content AI can cite
  | 'weak_authority_signals'    // No awards, lists, recognition
  | 'no_booking_signals'        // No booking platform presence

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface SignalGap {
  type: GapType
  severity: GapSeverity
  title: string
  explanation: string           // Why this matters for AI recommendation
  evidence: string              // What we found (or didn't find)
  benchmark: string             // What category leaders typically have
  affected_intents: string[]    // Which intent categories this hurts
  fix_available: boolean
  fix_type?: string             // Maps to fix-function FIX_CONFIGS key
  expected_impact: 'high' | 'medium' | 'low'
}

export interface ExternalSignals {
  // Knowledge graph
  wikipedia_found: boolean
  wikipedia_url: string | null
  wikidata_found: boolean

  // Directories (by business type)
  directories: {
    name: string
    found: boolean
    url: string | null
    review_count: number | null
    rating: number | null
  }[]

  // Review signals
  total_external_reviews: number
  review_platforms_present: number
  strongest_review_platform: string | null

  // Press / citations
  press_mentions_detected: number
  press_sources: string[]

  // Reddit
  reddit_discussions_found: boolean
  reddit_mention_count: number

  // Website own signals (from website auditor)
  has_schema: boolean
  has_faq: boolean
  has_booking: boolean
  has_contact: boolean

  // Computed
  external_citation_score: number   // 0-100
  directory_coverage_score: number  // 0-100
  review_signal_score: number       // 0-100
  knowledge_graph_score: number     // 0-100
}

export interface SignalGapReport {
  entity_name: string
  business_type: string
  location: string
  signals: ExternalSignals
  gaps: SignalGap[]
  overall_signal_score: number      // 0-100
  recommendation_readiness: 'strong' | 'moderate' | 'weak' | 'invisible'
  top_priority_fix: SignalGap | null
  computed_at: string
}

// ── Directory configs per business type ───────────────────────────────────────

const DIRECTORIES_BY_TYPE: Record<string, { name: string; searchUrl: string; domain: string }[]> = {
  restaurant: [
    { name: 'TripAdvisor',  domain: 'tripadvisor.com',  searchUrl: 'https://www.tripadvisor.com/Search?q={name}+{location}' },
    { name: 'Yelp',         domain: 'yelp.com',         searchUrl: 'https://www.yelp.com/search?find_desc={name}&find_loc={location}' },
    { name: 'TheFork',      domain: 'thefork.com',      searchUrl: 'https://www.thefork.com/search/?cityId=&query={name}' },
    { name: 'Google Maps',  domain: 'maps.google.com',  searchUrl: 'https://maps.google.com/?q={name}+{location}' },
    { name: 'OpenTable',    domain: 'opentable.com',    searchUrl: 'https://www.opentable.com/s/?term={name}&covers=2&dateTime=' },
  ],
  dentist: [
    { name: 'Zocdoc',       domain: 'zocdoc.com',       searchUrl: 'https://www.zocdoc.com/search/?q={name}' },
    { name: 'Healthgrades', domain: 'healthgrades.com', searchUrl: 'https://www.healthgrades.com/dentist-directory/' },
    { name: 'Google Maps',  domain: 'maps.google.com',  searchUrl: 'https://maps.google.com/?q={name}+{location}' },
    { name: 'Yelp',         domain: 'yelp.com',         searchUrl: 'https://www.yelp.com/search?find_desc={name}&find_loc={location}' },
  ],
  lawyer: [
    { name: 'Avvo',         domain: 'avvo.com',         searchUrl: 'https://www.avvo.com/find-a-lawyer/{location}' },
    { name: 'Martindale',   domain: 'martindale.com',   searchUrl: 'https://www.martindale.com/find-attorneys/' },
    { name: 'Google Maps',  domain: 'maps.google.com',  searchUrl: 'https://maps.google.com/?q={name}+{location}' },
    { name: 'Yelp',         domain: 'yelp.com',         searchUrl: 'https://www.yelp.com/search?find_desc={name}&find_loc={location}' },
  ],
  hotel: [
    { name: 'TripAdvisor',  domain: 'tripadvisor.com',  searchUrl: 'https://www.tripadvisor.com/Search?q={name}+{location}' },
    { name: 'Booking.com',  domain: 'booking.com',      searchUrl: 'https://www.booking.com/searchresults.html?ss={name}+{location}' },
    { name: 'Expedia',      domain: 'expedia.com',      searchUrl: 'https://www.expedia.com/Hotel-Search?destination={name}+{location}' },
    { name: 'Google Hotels',domain: 'maps.google.com',  searchUrl: 'https://www.google.com/travel/hotels/{location}' },
  ],
  default: [
    { name: 'Google Maps',  domain: 'maps.google.com',  searchUrl: 'https://maps.google.com/?q={name}+{location}' },
    { name: 'Yelp',         domain: 'yelp.com',         searchUrl: 'https://www.yelp.com/search?find_desc={name}&find_loc={location}' },
    { name: 'Facebook',     domain: 'facebook.com',     searchUrl: 'https://www.facebook.com/search/pages/?q={name}' },
  ],
}

// ── Signal detection via website scraping ─────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FindedBot/1.0; +https://finded.co/bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function checkWikipedia(entityName: string, location: string): Promise<{ found: boolean; url: string | null }> {
  try {
    const query = encodeURIComponent(`${entityName} ${location}`)
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=search&srsearch=${query}&format=json&srlimit=3&origin=*`
    const res = await fetchWithTimeout(apiUrl)
    if (!res) return { found: false, url: null }

    const data = JSON.parse(res)
    const results = data?.query?.search ?? []

    // Check if any result title closely matches the entity name
    const match = results.find((r: any) => {
      const title = r.title.toLowerCase()
      const name = entityName.toLowerCase()
      return title.includes(name) || name.includes(title.split(' ')[0])
    })

    if (match) {
      return {
        found: true,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(match.title)}`,
      }
    }
    return { found: false, url: null }
  } catch {
    return { found: false, url: null }
  }
}

async function checkDirectoryPresence(
  entityName: string,
  location: string,
  directory: { name: string; domain: string; searchUrl: string }
): Promise<{ found: boolean; url: string | null; review_count: number | null; rating: number | null }> {
  try {
    // Search Google for the entity on the specific directory
    const query = encodeURIComponent(`site:${directory.domain} "${entityName}" ${location}`)
    const searchUrl = `https://www.google.com/search?q=${query}&num=3`

    const html = await fetchWithTimeout(searchUrl)
    if (!html) return { found: false, url: null, review_count: null, rating: null }

    const lower = html.toLowerCase()
    const nameNorm = entityName.toLowerCase()

    // Check if the directory domain appears in results with the entity name
    const found = lower.includes(directory.domain) && lower.includes(nameNorm.split(' ')[0])

    // Extract review count if present
    const reviewMatch = html.match(/(\d{1,5})\s*(?:reviews?|beoordelingen|avis)/i)
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : null

    // Extract rating
    const ratingMatch = html.match(/(\d\.\d)\s*(?:\/\s*5|stars?|★)/i)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    return {
      found,
      url: found ? directory.searchUrl.replace('{name}', encodeURIComponent(entityName)).replace('{location}', encodeURIComponent(location)) : null,
      review_count: reviewCount,
      rating,
    }
  } catch {
    return { found: false, url: null, review_count: null, rating: null }
  }
}

async function checkRedditPresence(entityName: string, location: string): Promise<{ found: boolean; count: number }> {
  try {
    const query = encodeURIComponent(`"${entityName}" ${location}`)
    const url = `https://www.reddit.com/search.json?q=${query}&limit=5&sort=relevance`

    const html = await fetchWithTimeout(url)
    if (!html) return { found: false, count: 0 }

    const data = JSON.parse(html)
    const posts = data?.data?.children ?? []
    const count = posts.filter((p: any) => {
      const text = (p.data?.title + ' ' + p.data?.selftext).toLowerCase()
      return text.includes(entityName.toLowerCase().split(' ')[0])
    }).length

    return { found: count > 0, count }
  } catch {
    return { found: false, count: 0 }
  }
}

// ── Benchmarks by business type ───────────────────────────────────────────────

const BENCHMARKS: Record<string, {
  min_reviews_weak: number
  min_reviews_strong: number
  expected_directories: number
}> = {
  restaurant: { min_reviews_weak: 50,  min_reviews_strong: 200, expected_directories: 3 },
  dentist:    { min_reviews_weak: 20,  min_reviews_strong: 100, expected_directories: 2 },
  lawyer:     { min_reviews_weak: 10,  min_reviews_strong: 50,  expected_directories: 2 },
  hotel:      { min_reviews_weak: 100, min_reviews_strong: 500, expected_directories: 3 },
  default:    { min_reviews_weak: 20,  min_reviews_strong: 100, expected_directories: 2 },
}

// ── Gap detection ──────────────────────────────────────────────────────────────

function detectGaps(
  signals: ExternalSignals,
  businessType: string,
  websiteAudit: {
    schema_present: boolean
    faq_present: boolean
    booking_present: boolean
    contact_present: boolean
    review_count: number | null
  } | null
): SignalGap[] {
  const gaps: SignalGap[] = []
  const bench = BENCHMARKS[businessType] ?? BENCHMARKS.default
  const totalReviews = signals.total_external_reviews + (websiteAudit?.review_count ?? 0)

  // ── 1. Knowledge Graph ─────────────────────────────────────
  if (!signals.wikipedia_found && !signals.wikidata_found) {
    gaps.push({
      type: 'no_knowledge_graph',
      severity: 'high',
      title: 'Not in any knowledge graph',
      explanation: 'Wikipedia and Wikidata are primary training sources for all major LLMs. Entities without knowledge graph presence have significantly lower candidate recall probability.',
      evidence: 'No Wikipedia page or Wikidata entry found for this entity.',
      benchmark: 'Category leaders typically have Wikipedia pages or at minimum Wikidata entries with structured facts.',
      affected_intents: ['discovery', 'trust', 'authority'],
      fix_available: true,
      fix_type: 'authority_content',
      expected_impact: 'high',
    })
  }

  // ── 2. Directory coverage ──────────────────────────────────
  const missingDirectories = signals.directories.filter(d => !d.found)
  if (missingDirectories.length >= 2) {
    gaps.push({
      type: 'missing_directory',
      severity: missingDirectories.length >= 3 ? 'critical' : 'high',
      title: `Missing from ${missingDirectories.length} key directories`,
      explanation: 'LLMs train heavily on TripAdvisor, Yelp, Google Maps, and similar platforms. Absence from these directories means the entity is unlikely to appear in training data for most recommendation queries.',
      evidence: `Not found on: ${missingDirectories.map(d => d.name).join(', ')}`,
      benchmark: `${businessType} category leaders are typically listed on all ${bench.expected_directories}+ major directories with substantial review counts.`,
      affected_intents: ['discovery', 'trust', 'geographic', 'occasion'],
      fix_available: true,
      fix_type: 'reservation_markup',
      expected_impact: 'high',
    })
  }

  // ── 3. Review volume ───────────────────────────────────────
  if (totalReviews < bench.min_reviews_weak) {
    gaps.push({
      type: 'low_review_volume',
      severity: totalReviews === 0 ? 'critical' : 'high',
      title: 'Very low review volume',
      explanation: 'Review text is one of the strongest training signals for intent-specific recommendations. Reviews contain natural language describing the entity in terms of occasions, cuisine, atmosphere — exactly what AI models use for intent matching.',
      evidence: `Only ${totalReviews} external reviews detected. Category benchmark is ${bench.min_reviews_strong}+.`,
      benchmark: `Strong AI visibility requires ${bench.min_reviews_strong}+ reviews containing intent-relevant language.`,
      affected_intents: ['trust', 'occasion', 'discovery'],
      fix_available: false,
      expected_impact: 'high',
    })
  } else if (totalReviews < bench.min_reviews_strong) {
    gaps.push({
      type: 'low_review_volume',
      severity: 'medium',
      title: 'Below-benchmark review volume',
      explanation: 'More review text means more intent language for AI models to associate with this entity.',
      evidence: `${totalReviews} reviews detected. Strong category leaders have ${bench.min_reviews_strong}+.`,
      benchmark: `${bench.min_reviews_strong}+ reviews for strong recommendation probability.`,
      affected_intents: ['trust', 'discovery'],
      fix_available: false,
      expected_impact: 'medium',
    })
  }

  // ── 4. Reddit ──────────────────────────────────────────────
  if (!signals.reddit_discussions_found) {
    gaps.push({
      type: 'no_reddit_presence',
      severity: 'medium',
      title: 'No Reddit discussions found',
      explanation: 'Reddit is heavily weighted in LLM training data (GPT-4, Claude, Gemini all train on Reddit). When people ask "where do locals eat in X?" Reddit threads are a primary signal source.',
      evidence: 'No Reddit posts or comments mentioning this entity were found.',
      benchmark: 'Category leaders typically appear in 5-20 Reddit discussions, often in recommendation threads.',
      affected_intents: ['local', 'trust', 'discovery'],
      fix_available: true,
      fix_type: 'authority_content',
      expected_impact: 'medium',
    })
  }

  // ── 5. Schema markup ───────────────────────────────────────
  if (!websiteAudit?.schema_present) {
    gaps.push({
      type: 'missing_schema',
      severity: 'medium',
      title: 'No structured data on website',
      explanation: 'Schema.org markup helps Perplexity (live retrieval) and Google (Knowledge Graph) correctly classify the entity. Important for freshness and for entities without strong external citation.',
      evidence: 'No JSON-LD or Schema.org markup detected on website.',
      benchmark: 'All well-optimized entities have LocalBusiness or specific type schema markup.',
      affected_intents: ['discovery', 'geographic'],
      fix_available: true,
      fix_type: 'schema_jsonld',
      expected_impact: 'medium',
    })
  }

  // ── 6. FAQ content ─────────────────────────────────────────
  if (!websiteAudit?.faq_present) {
    gaps.push({
      type: 'no_faq_content',
      severity: 'medium',
      title: 'No FAQ content',
      explanation: 'FAQ pages are directly cited by AI models when answering specific questions. They create strong intent associations — "Do you take reservations?" maps to booking intent, "Is it good for families?" maps to family dining intent.',
      evidence: 'No FAQ section or FAQ schema detected on website.',
      benchmark: 'High-visibility entities have FAQ pages with 10-20 Q&As covering all major intent categories.',
      affected_intents: ['occasion', 'problem', 'discovery'],
      fix_available: true,
      fix_type: 'faq_page',
      expected_impact: 'medium',
    })
  }

  // ── 7. Authority signals ───────────────────────────────────
  if (signals.press_mentions_detected === 0 && !signals.wikipedia_found) {
    gaps.push({
      type: 'weak_authority_signals',
      severity: 'high',
      title: 'No press or authority citations',
      explanation: 'Press mentions, award listings, and top-10 list inclusions from authoritative sources carry outsized weight in LLM training data. A single NYT or local newspaper mention can significantly boost recommendation probability.',
      evidence: 'No press mentions or authority citations detected in external signals.',
      benchmark: 'Category leaders typically have 3-10 press mentions and appear in at least one "best of" list.',
      affected_intents: ['trust', 'authority', 'discovery'],
      fix_available: true,
      fix_type: 'authority_content',
      expected_impact: 'high',
    })
  }

  // ── 8. Booking/contact signals ────────────────────────────
  if (!websiteAudit?.booking_present && !websiteAudit?.contact_present) {
    gaps.push({
      type: 'no_booking_signals',
      severity: 'low',
      title: 'No booking or contact signals on website',
      explanation: 'For Perplexity (live retrieval) and Google, booking links and contact information signal an active, legitimate business. Absence can reduce confidence in entity recommendations.',
      evidence: 'No booking platform links or contact information found on website.',
      benchmark: 'Active businesses typically have clear booking CTAs and contact details.',
      affected_intents: ['occasion', 'problem'],
      fix_available: true,
      fix_type: 'reservation_markup',
      expected_impact: 'low',
    })
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

// ── Score computation ──────────────────────────────────────────────────────────

function computeSignalScore(signals: ExternalSignals, businessType: string): number {
  const bench = BENCHMARKS[businessType] ?? BENCHMARKS.default
  let score = 0

  // Knowledge graph (25 points)
  if (signals.wikipedia_found) score += 25
  else if (signals.wikidata_found) score += 10

  // Directory coverage (25 points)
  const dirCoverage = signals.directories.filter(d => d.found).length / Math.max(signals.directories.length, 1)
  score += Math.round(dirCoverage * 25)

  // Review signals (20 points)
  const reviewScore = Math.min(1, signals.total_external_reviews / bench.min_reviews_strong)
  score += Math.round(reviewScore * 20)

  // Reddit (10 points)
  if (signals.reddit_discussions_found) score += Math.min(10, signals.reddit_mention_count * 2)

  // Press (10 points)
  score += Math.min(10, signals.press_mentions_detected * 3)

  // Platform count (10 points)
  score += Math.min(10, signals.review_platforms_present * 3)

  return Math.min(100, score)
}

function getReadiness(score: number): 'strong' | 'moderate' | 'weak' | 'invisible' {
  if (score >= 70) return 'strong'
  if (score >= 45) return 'moderate'
  if (score >= 20) return 'weak'
  return 'invisible'
}

// ── Main exported function ─────────────────────────────────────────────────────

export async function detectSignalGaps(
  entityName: string,
  businessType: string,
  location: string,
  websiteAudit: {
    schema_present: boolean
    faq_present: boolean
    booking_present: boolean
    contact_present: boolean
    review_count: number | null
  } | null
): Promise<SignalGapReport> {
  const directories = DIRECTORIES_BY_TYPE[businessType] ?? DIRECTORIES_BY_TYPE.default

  // Run all checks in parallel
  const [
    wikipediaResult,
    redditResult,
    ...directoryResults
  ] = await Promise.all([
    checkWikipedia(entityName, location),
    checkRedditPresence(entityName, location),
    ...directories.map(d => checkDirectoryPresence(entityName, location, d)),
  ])

  const directorySignals = directories.map((d, i) => ({
    name: d.name,
    ...directoryResults[i],
  }))

  const totalExternalReviews = directorySignals.reduce(
    (sum, d) => sum + (d.review_count ?? 0), 0
  )
  const platformsPresent = directorySignals.filter(d => d.found).length

  const signals: ExternalSignals = {
    wikipedia_found: wikipediaResult.found,
    wikipedia_url: wikipediaResult.url,
    wikidata_found: false, // future: check Wikidata API

    directories: directorySignals,

    total_external_reviews: totalExternalReviews,
    review_platforms_present: platformsPresent,
    strongest_review_platform: directorySignals
      .filter(d => d.found && d.review_count)
      .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))[0]?.name ?? null,

    press_mentions_detected: 0,  // future: check news API
    press_sources: [],

    reddit_discussions_found: redditResult.found,
    reddit_mention_count: redditResult.count,

    has_schema:   websiteAudit?.schema_present ?? false,
    has_faq:      websiteAudit?.faq_present ?? false,
    has_booking:  websiteAudit?.booking_present ?? false,
    has_contact:  websiteAudit?.contact_present ?? false,

    external_citation_score:  0,
    directory_coverage_score: Math.round((platformsPresent / directories.length) * 100),
    review_signal_score:      0,
    knowledge_graph_score:    wikipediaResult.found ? 100 : 0,
  }

  const gaps = detectGaps(signals, businessType, websiteAudit)
  const overallScore = computeSignalScore(signals, businessType)

  return {
    entity_name: entityName,
    business_type: businessType,
    location,
    signals,
    gaps,
    overall_signal_score: overallScore,
    recommendation_readiness: getReadiness(overallScore),
    top_priority_fix: gaps[0] ?? null,
    computed_at: new Date().toISOString(),
  }
}
