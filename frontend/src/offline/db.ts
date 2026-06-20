import Dexie, { type EntityTable } from 'dexie'

export interface OfflineScenario {
  id: string            // e.g., "foundational_literacy_001"
  category: string
  grade_band: string    // "Foundational (1-2)" | "Preparatory (3-5)" | "Middle (6-8)" | "all"
  subject: string
  language: 'hi' | 'en'
  title: string         // The scenario title (used for TF-IDF matching)
  query_text: string    // Representative query text
  response: object      // Full QueryResponse object (serialized JSON)
}

class SaathiDB extends Dexie {
  scenarios!: EntityTable<OfflineScenario, 'id'>

  constructor() {
    super('SaathiShikshakOfflineDB')
    this.version(1).stores({
      scenarios: 'id, category, grade_band, subject, language',
    })
  }
}

export const db = new SaathiDB()

// Helper: store scenarios in bulk
export async function bulkUpsertScenarios(scenarios: OfflineScenario[]) {
  await db.scenarios.bulkPut(scenarios)
}

// Helper: get scenarios by subject and language
export async function getScenariosBySubject(
  subject: string,
  language: 'hi' | 'en' = 'hi'
): Promise<OfflineScenario[]> {
  return db.scenarios
    .where('subject').equals(subject)
    .filter(s => s.language === language)
    .toArray()
}

// Helper: get all scenarios
export async function getAllScenarios(language: 'hi' | 'en' = 'hi'): Promise<OfflineScenario[]> {
  return db.scenarios.filter(s => s.language === language).toArray()
}