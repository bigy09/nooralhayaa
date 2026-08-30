import React, { useState } from 'react'
import { uploadFile } from '../utils/upload'

export default function UploadExample() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadFile(file)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: 12 }}>
          <strong>Uploaded:</strong>
          <div><a href={result.url} target="_blank" rel="noreferrer">{result.url}</a></div>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
}
