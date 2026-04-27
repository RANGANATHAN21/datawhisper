import { useState, useEffect } from 'react'
import { fetchPreview } from '../utils/api'

export default function PreviewPanel({ sessionId, sheetKey }) {
  const [n, setN] = useState(10)
  const [inputN, setInputN] = useState('10')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!sheetKey) return
    load(n)
  }, [sheetKey, sessionId])

  const load = async (rows) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPreview(sessionId, sheetKey, rows)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const applyN = () => {
    const v = Math.max(1, Math.min(1000, parseInt(inputN) || 10))
    setN(v)
    setInputN(String(v))
    load(v)
  }

  if (!sheetKey) return null

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          SHOW TOP
        </span>
        <input
          type="number"
          value={inputN}
          min={1} max={1000}
          onChange={e => setInputN(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyN()}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 'var(--radius-sm)',
            padding: '5px 10px', width: 72, fontFamily: 'var(--mono)',
            fontSize: '0.88rem', textAlign: 'center', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <span style={{ fontSize: '0.78rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          ROWS
        </span>
        <button onClick={applyN} style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          color: 'var(--text2)', padding: '5px 14px', borderRadius: 'var(--radius-sm)',
          cursor: 'pointer', fontFamily: 'var(--body)', fontSize: '0.82rem',
          transition: 'all 0.18s',
        }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
        >Apply</button>

        {loading && <div className="spinner" />}
      </div>

      {error && <ErrorBox msg={error} />}

      {data && !loading && (
        <div style={{
          borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          overflow: 'hidden', background: 'var(--bg2)',
        }}>
          <div style={{ overflowX: 'auto', maxHeight: 520 }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: '0.82rem', fontFamily: 'var(--mono)',
            }}>
              <thead>
                <tr>
                  <th style={{...thStyle, color: 'var(--text3)', width: 40 }}>#</th>
                  {data.columns.map(c => (
                    <th key={c} style={thStyle}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseOut={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...tdStyle, color: 'var(--text3)', textAlign: 'center' }}>{i + 1}</td>
                    {data.columns.map(c => (
                      <td key={c} style={tdStyle}>
                        {row[c] === null ? <span style={{ color: 'var(--text3)' }}>—</span> : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg3)', fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Showing {data.rows.length} rows · {data.columns.length} columns
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '9px 14px', textAlign: 'left',
  background: 'var(--bg3)', color: 'var(--accent2)',
  position: 'sticky', top: 0,
  fontSize: '0.72rem', letterSpacing: '0.06em',
  fontWeight: 500, whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
}
const tdStyle = {
  padding: '7px 14px', color: 'var(--text2)',
  whiteSpace: 'nowrap', maxWidth: 240,
  overflow: 'hidden', textOverflow: 'ellipsis',
}

function ErrorBox({ msg }) {
  return (
    <p style={{ color: 'var(--red)', fontSize: '0.84rem', padding: '8px 12px', background: 'rgba(255,107,107,0.08)', borderRadius: 6, border: '1px solid rgba(255,107,107,0.2)' }}>
      {msg}
    </p>
  )
}
