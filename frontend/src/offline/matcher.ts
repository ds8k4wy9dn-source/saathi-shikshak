import { db, type OfflineScenario } from './db'
import type { QueryResponse } from '../api/types'

// ─── Stopwords (Hindi + English) ─────────────────────────────────────────────
const STOP = new Set([
  // Hindi
  'का','की','के','में','है','हैं','नहीं','से','को','पर','और','या',
  'मेरे','मेरी','कैसे','क्या','करूं','करें','कि','तो','भी','यह',
  'वह','इस','उस','एक','हो','जा','रहे','रहा','रही',
  // English
  'the','a','an','in','on','at','is','are','not','my','i','do',
  'how','what','should','can','to','for','of','and','or','with',
  'have','has','their','they','we','this','that','it',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,।.!?:()"'’-]+/)
    .filter(t => t.length > 1 && !STOP.has(t))
}

// ─── Normalized TF vector ─────────────────────────────────────────────────────
function buildTfVector(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const maxFreq = Math.max(...tf.values(), 1)
  tf.forEach((v, k) => tf.set(k, v / maxFreq))
  return tf
}

// ─── Cosine similarity ────────────────────────────────────────────────────────
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0
  a.forEach((val, key) => { dot += val * (b.get(key) ?? 0); magA += val * val })
  b.forEach(val => { magB += val * val })
  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ─── Grade band helper ────────────────────────────────────────────────────────
const GRADE_BAND: Record<string, string> = {
  '1': 'Foundational (1-2)', '2': 'Foundational (1-2)',
  '3': 'Preparatory (3-5)', '4': 'Preparatory (3-5)', '5': 'Preparatory (3-5)',
  '6': 'Middle (6-8)', '7': 'Middle (6-8)', '8': 'Middle (6-8)',
}

/**
 * Find the best-matching pre-computed scenario for an offline query.
 *
 * @param query        The teacher's raw query text
 * @param grade        Currently selected grade ('1'–'8')
 * @param subject      Currently selected subject key
 * @param language     'hi' | 'en'
 * @param threshold    Minimum cosine similarity score to accept a match (default 0.22)
 * @returns            The matched scenario + its response, or null if no good match
 */
export async function findOfflineMatch(
  query: string,
  grade: string,
  subject: string,
  language: 'hi' | 'en' = 'hi',
  threshold = 0.22
): Promise<{ scenario: OfflineScenario; similarity: number; response: QueryResponse } | null> {

  const candidates = await db.scenarios
    .filter(s => s.language === language)
    .toArray()

  if (candidates.length === 0) return null

  const queryVec = buildTfVector(tokenize(query))
  const targetBand = GRADE_BAND[grade] ?? 'Preparatory (3-5)'

  let bestMatch: OfflineScenario | null = null
  let bestScore = threshold

  for (const scenario of candidates) {
    // Score based on text similarity of title + query_text combined
    const candidateText = `${scenario.title} ${scenario.query_text}`
    const candidateVec = buildTfVector(tokenize(candidateText))
    let sim = cosine(queryVec, candidateVec)

    // Boost for matching grade band and subject — rewards relevant context
    if (scenario.grade_band === targetBand) sim += 0.08
    if (scenario.grade_band === 'all')      sim += 0.03
    if (scenario.subject === subject)       sim += 0.07
    if (scenario.subject === 'general')     sim += 0.02

    if (sim > bestScore) {
      bestScore = sim
      bestMatch = scenario
    }
  }

  if (!bestMatch) return null

  return {
    scenario: bestMatch,
    similarity: bestScore,
    response: bestMatch.response as QueryResponse,
  }
}