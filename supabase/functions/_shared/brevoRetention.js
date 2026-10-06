export function classifyBrevoContact(contact, now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 3)
  const created = Date.parse(contact.createdAt ?? '')
  if (!Number.isFinite(created) || created > now.getTime()) return 'unknown'
  if (created > cutoff.getTime()) return 'recent'
  // An older creation date does not prove three years of inactivity.
  // This report never treats opens or modifiedAt as an active contact.
  return 'needsReview'
}

/** Uses the existing server-side Brevo key. Returns counts only; never deletes contacts. */
export async function auditBrevoRetention(options = {}) {
  const apiKey = options.apiKey ?? Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(options.listId ?? Deno.env.get('BREVO_LIST_ID') ?? '')
  const request = options.request ?? fetch
  const now = options.now ?? new Date()
  const report = { total: 0, recent: 0, needsReview: 0, unknown: 0, failed: 0, complete: false }
  if (!apiKey || !Number.isInteger(listId) || listId < 1) return { ...report, failed: 1 }
  try {
    for (let offset = 0; offset < 1000; offset += 50) {
      const response = await request(
        'https://api.brevo.com/v3/contacts/lists/' + listId + '/contacts?limit=50&offset=' + offset,
        { headers: { accept: 'application/json', 'api-key': apiKey } },
      )
      if (!response.ok) throw new Error('brevo_retention_unavailable')
      const payload = await response.json()
      if (!Array.isArray(payload.contacts)) throw new Error('brevo_retention_invalid_response')
      for (const contact of payload.contacts) {
        report.total++
        report[classifyBrevoContact(contact, now)]++
      }
      if (payload.contacts.length < 50) { report.complete = true; break }
    }
  } catch { report.failed++ }
  // Do not silently claim a complete audit if the account exceeded the batch cap.
  if (!report.complete && !report.failed) report.failed++
  return report
}
