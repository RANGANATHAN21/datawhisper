import { useState, useRef, useCallback } from 'react'
import { uploadFiles } from '../utils/api'

const ALLOWED = ['.csv', '.xls', '.xlsx']
const MAX_MB = 10

function validateFiles(files) {
  for (const f of files) {
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!ALLOWED.includes(ext)) return `"${f.name}" is not a CSV or Excel file.`
    if (f.size > MAX_MB * 1024 * 1024) return `"${f.name}" exceeds ${MAX_MB} MB.`
  }
  return null
}

export default function UploadZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    processFiles(dropped)
  }, [])

  const processFiles = (newFiles) => {
    const err = validateFiles(newFiles)
    if (err) { setError(err); return }
    setError(null)
    setFiles(newFiles)
  }

  const handleUpload = async () => {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const data = await uploadFiles(files)
      onUploaded(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '52px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(124,106,247,0.06)' : 'var(--bg2)',
          transition: 'all 0.25s',
          animation: dragging ? 'pulse-glow 1.5s infinite' : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={e => processFiles(Array.from(e.target.files))}
        />
        <div style={{ marginBottom: 12 }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto' }}>
            <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.1"/>
            <path d="M20 28V16M20 16l-5 5M20 16l5 5" stroke="var(--accent2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 30h16" stroke="var(--border-hover)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
          Drop files here or click to browse
        </p>
        <p style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>
          CSV, XLS, XLSX · up to {MAX_MB} MB per file · multiple files allowed
        </p>
      </div>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, i) => (
            <FileChip key={i} file={f} onRemove={() => setFiles(fs => fs.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.84rem', padding: '8px 12px', background: 'rgba(255,107,107,0.08)', borderRadius: 6, border: '1px solid rgba(255,107,107,0.2)' }}>
          {error}
        </p>
      )}

      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            background: loading ? 'var(--bg3)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '13px 24px',
            fontFamily: 'var(--display)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.2s',
            letterSpacing: '0.01em',
          }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#9081f8' }}
          onMouseOut={e => { if (!loading) e.currentTarget.style.background = 'var(--accent)' }}
        >
          {loading ? <><div className="spinner" style={{ borderTopColor: '#fff' }} /> Uploading…</> : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

function FileChip({ file, onRemove }) {
  const ext = file.name.split('.').pop().toUpperCase()
  const size = (file.size / 1024).toFixed(0) + ' KB'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px',
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: '0.68rem', fontWeight: 500,
        background: 'var(--accent-glow)', color: 'var(--accent2)',
        padding: '2px 6px', borderRadius: 4, flexShrink: 0,
      }}>{ext}</span>
      <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
      <span style={{ color: 'var(--text3)', fontSize: '0.78rem', flexShrink: 0 }}>{size}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2, borderRadius: 4 }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--text3)'}
      >×</button>
    </div>
  )
}
