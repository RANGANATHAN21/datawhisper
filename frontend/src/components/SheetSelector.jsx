export default function SheetSelector({ sheets, active, onChange }) {
  return (
    <div>
      <p style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 10 }}>
        SHEETS / FILES
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sheets.map(s => (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              background: active === s.key ? 'var(--accent-glow)' : 'var(--bg2)',
              border: `1px solid ${active === s.key ? 'var(--accent)' : 'var(--border)'}`,
              color: active === s.key ? 'var(--accent2)' : 'var(--text2)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--display)',
              fontWeight: 600,
              fontSize: '0.82rem',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseOver={e => { if (active !== s.key) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' } }}
            onMouseOut={e => { if (active !== s.key) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' } }}
          >
            {s.key}
            <span style={{ fontSize: '0.7rem', opacity: 0.6, fontFamily: 'var(--mono)', fontWeight: 400 }}>
              {s.rows.toLocaleString()}r
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
