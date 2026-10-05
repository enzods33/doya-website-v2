const KEY = 'doya-local-video-preview-v1'

export function readLocalVideoPreview() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

export function writeLocalVideoPreview(row) {
  localStorage.setItem(KEY, JSON.stringify(row))
}
