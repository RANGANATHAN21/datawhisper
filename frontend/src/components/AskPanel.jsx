import { useState, useEffect, useRef } from 'react'
import { askQuestion, generateChart, sendFeedback } from '../utils/api'
import ChartCard from './ChartCard'

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^\|(.+)\|\s*$/gm, (_, row) => {
      const cells = row.split('|').map(c => c.trim())
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, m => {
      const rows = m.trim().split('\n').filter(r => !r.match(/^<tr>[\s|:-]+<\/tr>$/))
      if (!rows.length) return m
      const [head, ...body] = rows
      const headCells = head.replace(/<\/?t[rd]>/g, '|').split('|').filter(Boolean)
      const headRow = '<tr>' + headCells.map(c => `<th>${c}</th>`).join('') + '</tr>'
      return `<table>${headRow}${body.join('')}</table>`
    })
    .replace(/```[\w]*\n([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n\n+/).map(p => p.startsWith('<') ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')
  return html
}

export default function AskPanel({ sessionId, sheets, activeSheet, onAnswer }) {
  const [question, setQuestion] = useState('')
  const [targetSheet, setTargetSheet] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState([])
  const textareaRef = useRef()

  useEffect(() => {
    const handler = (e) => {
      setQuestion(e.detail)
      textareaRef.current?.focus()
    }
    window.addEventListener('reuse-prompt', handler)
    return () => window.removeEventListener('reuse-prompt', handler)
  }, [])

  const handleAsk = async () => {
    const q = question.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const res = await askQuestion(sessionId, q, targetSheet)
      const record = { id: res.id, question: q, answer: res.answer, target_sheet: targetSheet, feedback: null, chart: null }
      setAnswers(a => [record, ...a])
      onAnswer(record)
      setQuestion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChart = async () => {
    const q = question.trim()
    if (!q) return
    setChartLoading(true)
    setError(null)
    try {
      const res = await generateChart(sessionId, q, targetSheet)
      const record = { id: res.id, question: q, answer: null, target_sheet: targetSheet, feedback: null, chart: res.chart }
      setAnswers(a => [record, ...a])
      onAnswer(record)
      setQuestion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setChartLoading(false)
    }
  }

  const handleFeedback = async (record, useful) => {
    try {
      await sendFeedback(sessionId, record.id, useful)
      setAnswers(a => a.map(r => r.id === record.id ? { ...r, feedback: useful } : r))
    } catch (_) {}
  }

  const busy = loading || chartLoading
  const hasQ = !!question.trim()

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Input area */}
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'border-color 0.2s' }}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk() }}
          placeholder="Ask anything… e.g. 'What is the survival rate by class?' or 'Show age distribution as a chart'"
          rows={4}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)', fontFamily: 'var(--body)', fontWeight: 300,
            fontSize: '0.95rem', padding: '16px', resize: 'none', lineHeight: 1.6,
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg3)',
          flexWrap: 'wrap', gap: 8,
        }}>
          {/* Sheet scope */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>SCOPE:</span>
            <button onClick={() => setTargetSheet(null)} style={scopeBtn(targetSheet === null)}>All sheets</button>
            {sheets.map(s => (
              <button key={s.key} onClick={() => setTargetSheet(s.key)} style={scopeBtn(targetSheet === s.key)}>
                {s.key}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>⌘+Enter</span>

            {/* Generate Chart button */}
            <button
              onClick={handleChart}
              disabled={busy || !hasQ}
              title="Generate a chart from your question"
              style={{
                background: busy || !hasQ ? 'var(--bg)' : 'var(--bg3)',
                color: busy || !hasQ ? 'var(--text3)' : 'var(--accent2)',
                border: `1px solid ${busy || !hasQ ? 'var(--border)' : 'var(--accent)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '7px 14px', cursor: busy || !hasQ ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--display)', fontWeight: 600, fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.18s',
              }}
            >
              {chartLoading
                ? <><div className="spinner" style={{ width: 13, height: 13, borderTopColor: 'var(--accent2)' }} /> Charting…</>
                : '📊 Chart'}
            </button>

            {/* Ask button */}
            <button
              onClick={handleAsk}
              disabled={busy || !hasQ}
              style={{
                background: busy || !hasQ ? 'var(--bg)' : 'var(--accent)',
                color: busy || !hasQ ? 'var(--text3)' : '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '7px 18px', cursor: busy || !hasQ ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--display)', fontWeight: 700, fontSize: '0.84rem',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.18s',
              }}
            >
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} /> Thinking…</> : 'Ask'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: '0.84rem', padding: '8px 12px', background: 'rgba(255,107,107,0.08)', borderRadius: 6, border: '1px solid rgba(255,107,107,0.2)' }}>{error}</p>
      )}

      {/* Answers & Charts */}
      {answers.map(record => (
        record.chart
          ? <ChartCard key={record.id} config={record.chart} question={record.question} record={record} onFeedback={handleFeedback} />
          : <AnswerCard key={record.id} record={record} onFeedback={handleFeedback} />
      ))}
    </div>
  )
}

function AnswerCard({ record, onFeedback }) {
  return (
    <div className="fade-up" style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <p style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
          {record.question}
        </p>
        {record.target_sheet && (
          <span style={{ fontSize: '0.68rem', color: 'var(--accent2)', fontFamily: 'var(--mono)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>
            {record.target_sheet}
          </span>
        )}
      </div>
      <div
        className="answer-prose"
        style={{ padding: '16px' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(record.answer) }}
      />
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg3)' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Was this helpful?</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <FeedbackBtn label="👍 Yes" active={record.feedback === true} activeColor="var(--green)" onClick={() => onFeedback(record, true)} />
          <FeedbackBtn label="👎 No" active={record.feedback === false} activeColor="var(--red)" onClick={() => onFeedback(record, false)} />
        </div>
      </div>
    </div>
  )
}

function FeedbackBtn({ label, active, activeColor, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${activeColor}22` : 'none',
      border: `1px solid ${active ? activeColor : 'var(--border)'}`,
      color: active ? activeColor : 'var(--text2)',
      padding: '4px 12px', borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.18s',
    }}>
      {label}
    </button>
  )
}

function scopeBtn(active) {
  return {
    background: active ? 'var(--accent-glow)' : 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? 'var(--accent2)' : 'var(--text3)',
    padding: '3px 10px', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--mono)',
    transition: 'all 0.15s',
  }
}
