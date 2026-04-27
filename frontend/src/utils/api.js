const BASE = '/api'

export async function uploadFiles(files) {
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed')
  return res.json()
}

export async function fetchPreview(sessionId, sheetKey, n) {
  const url = `${BASE}/preview?session_id=${sessionId}&sheet_key=${encodeURIComponent(sheetKey)}&n=${n}`
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json()).detail || 'Preview failed')
  return res.json()
}

export async function askQuestion(sessionId, question, targetSheet) {
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question, target_sheet: targetSheet || null }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'AI request failed')
  return res.json()
}

export async function generateChart(sessionId, question, targetSheet) {
  const res = await fetch(`${BASE}/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question, target_sheet: targetSheet || null }),
  })
  if (!res.ok) throw new Error((await res.json()).detail || 'Chart generation failed')
  return res.json()
}

export async function sendFeedback(sessionId, recordId, useful) {
  const res = await fetch(`${BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, record_id: recordId, useful }),
  })
  if (!res.ok) throw new Error('Feedback failed')
  return res.json()
}

export async function fetchHistory(sessionId) {
  const res = await fetch(`${BASE}/history?session_id=${sessionId}`)
  if (!res.ok) throw new Error('History fetch failed')
  return res.json()
}
