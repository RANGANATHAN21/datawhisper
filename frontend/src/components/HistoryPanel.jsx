import { sendFeedback } from '../utils/api'

export default function HistoryPanel({ history, sessionId, onFeedback, onReuse }) {
  if (!history.length) {
    return (
      <div className="fade-up" style={{
        textAlign: 'center', padding: '60px 0', color: 'var(--text3)',
      }}>
        <p style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No history yet</p>
        <p style={{ fontSize: '0.85rem' }}>Your questions and answers will appear here after you use the Ask tab.</p>
      </div>
    )
  }

  const handleFeedback = async (record, useful) => {
    try {
      await sendFeedback(sessionId, record.id, useful)
      onFeedback(record.id, useful)
    } catch (_) {}
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {history.length} PROMPT{history.length !== 1 ? 'S' : ''} IN SESSION
        </span>
        <FeedbackSummary history={history} />
      </div>

      {history.map(record => (
        <HistoryCard
          key={record.id}
          record={record}
          onFeedback={handleFeedback}
          onReuse={onReuse}
        />
      ))}
    </div>
  )
}

function HistoryCard({ record, onFeedback, onReuse }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        padding: '11px 16px', background: 'var(--bg3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', flex: 1 }}>
          {record.question}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {record.target_sheet && (
            <span style={{ fontSize: '0.68rem', color: 'var(--accent2)', fontFamily: 'var(--mono)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: 4 }}>
              {record.target_sheet}
            </span>
          )}
          <FeedbackBadge feedback={record.feedback} />
          <button
            onClick={() => onReuse(record.question)}
            title="Re-use this prompt"
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text3)', padding: '3px 10px', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'var(--mono)',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            ↺ Reuse
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.65 }}>
        <p style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {record.answer}
        </p>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Rate this answer:</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => onFeedback(record, v)} style={{
              background: record.feedback === v ? (v ? 'rgba(61,220,132,0.12)' : 'rgba(255,107,107,0.12)') : 'none',
              border: `1px solid ${record.feedback === v ? (v ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
              color: record.feedback === v ? (v ? 'var(--green)' : 'var(--red)') : 'var(--text3)',
              padding: '3px 12px', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.18s',
            }}>
              {v ? '👍' : '👎'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FeedbackBadge({ feedback }) {
  if (feedback === null || feedback === undefined) return null
  return (
    <span style={{
      fontSize: '0.68rem', fontFamily: 'var(--mono)',
      color: feedback ? 'var(--green)' : 'var(--red)',
      background: feedback ? 'rgba(61,220,132,0.1)' : 'rgba(255,107,107,0.1)',
      border: `1px solid ${feedback ? 'var(--green)' : 'var(--red)'}`,
      padding: '2px 7px', borderRadius: 4, opacity: 0.85,
    }}>
      {feedback ? '✓ Helpful' : '✗ Not helpful'}
    </span>
  )
}

function FeedbackSummary({ history }) {
  const rated = history.filter(r => r.feedback !== null && r.feedback !== undefined)
  const positive = rated.filter(r => r.feedback === true).length
  if (!rated.length) return null
  const pct = Math.round((positive / rated.length) * 100)
  return (
    <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
      <span style={{ color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)' }}>
        {pct}%
      </span> helpful ({rated.length}/{history.length} rated)
    </span>
  )
}
