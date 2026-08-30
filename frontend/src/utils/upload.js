import { buildApiUrl } from './api'

export async function uploadFile(file) {
  if (!file) throw new Error('No file provided')
  const url = buildApiUrl('/api/uploads') || '/api/uploads'

  const headers = new Headers()
  headers.set('x-filename', file.name)
  headers.set('content-type', file.type || 'application/octet-stream')

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: file,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Upload failed: ${resp.status} ${text}`)
  }

  return resp.json()
}
