import { apiClient } from '../api/client'
import { bulkUpsertScenarios, db } from './db'

let _syncAttempted = false

/**
 * Fetch offline scenarios from the backend and store them in IndexedDB.
 * Called once per session, 2 seconds after app mount to avoid competing
 * with the auth flow or initial page render.
 * Fails completely silently — offline matching just won't work on first
 * install until the next time the app is opened with internet.
 */
export async function syncOfflineScenarios(): Promise<void> {
  if (_syncAttempted) return
  _syncAttempted = true

  try {
    // Skip if Dexie already has a healthy population of scenarios
    const existingCount = await db.scenarios.count()
    if (existingCount >= 50) {
      console.log(`📦 Offline scenarios already cached (${existingCount} entries)`)
      return
    }

    console.log('📥 Fetching offline scenarios from backend...')
    const { scenarios, count } = await apiClient.getScenarios()

    if (scenarios && scenarios.length > 0) {
      await bulkUpsertScenarios(scenarios)
      console.log(`✅ Synced ${count} offline scenarios to IndexedDB`)
    } else {
      console.log('ℹ️  Backend returned 0 scenarios (run generate_scenarios.py first)')
    }
  } catch (err) {
    // Completely silent in production — this is a best-effort background operation
    console.warn('⚠️  Offline scenario sync skipped:', err)
  }
}