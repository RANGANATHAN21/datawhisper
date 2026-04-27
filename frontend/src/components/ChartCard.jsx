import { useEffect, useRef } from 'react'

/**
 * Renders a Chart.js v4 chart from a raw config object.
 * Chart.js is loaded from CDN via a <script> tag injected once.
 */

let chartJsLoaded = false
let chartJsCallbacks = []

function loadChartJs(cb) {
  if (chartJsLoaded) { cb(); return }
  chartJsCallbacks.push(cb)
  if (document.querySelector('#chartjs-cdn')) return
  const s = document.createElement('script')
  s.id = 'chartjs-cdn'
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js'
  s.onload = () => {
    chartJsLoaded = true
    chartJsCallbacks.forEach(fn => fn())
    chartJsCallbacks = []
  }
  document.head.appendChild(s)
}

export default function ChartCard({ config, question, onFeedback, record }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!config) return
    loadChartJs(() => {
      if (!canvasRef.current) return
      if (chartRef.current) { chartRef.current.destroy() }
      try {
        // Deep-clone so Chart.js mutations don't affect stored config
        const cfg = JSON.parse(JSON.stringify(config))
        // Ensure responsive options
        cfg.options = cfg.options || {}
        cfg.options.responsive = true
        cfg.options.maintainAspectRatio = false
        cfg.options.plugins = cfg.options.plugins || {}
        cfg.options.plugins.title = cfg.options.plugins.title || {}
        cfg.options.plugins.title.color = '#e8e8f0'
        cfg.options.plugins.legend = cfg.options.plugins.legend || {}
        cfg.options.plugins.legend.labels = { color: '#9090a8', font: { family: 'Inter, sans-serif' } }
        // Axis tick colours
        if (cfg.options.scales) {
          Object.values(cfg.options.scales).forEach(scale => {
            scale.ticks = scale.ticks || {}
            scale.ticks.color = '#9090a8'
            scale.grid = scale.grid || {}
            scale.grid.color = 'rgba(90,90,114,0.25)'
          })
        }
        chartRef.current = new window.Chart(canvasRef.current, cfg)
      } catch (err) {
        console.error('Chart render error:', err)
      }
    })
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [config])

  return (
    <div className="fade-up" style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent2)', fontFamily: 'var(--mono)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: 4 }}>
            CHART
          </span>
          <p style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
            {question}
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ padding: '20px', background: 'var(--bg2)' }}>
        <div style={{ position: 'relative', height: 340 }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Feedback footer */}
      {record && (
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg3)',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Was this chart useful?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => onFeedback && onFeedback(record, v)} style={{
                background: record.feedback === v ? (v ? 'rgba(61,220,132,0.12)' : 'rgba(255,107,107,0.12)') : 'none',
                border: `1px solid ${record.feedback === v ? (v ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                color: record.feedback === v ? (v ? 'var(--green)' : 'var(--red)') : 'var(--text2)',
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.18s',
              }}>
                {v ? '👍 Yes' : '👎 No'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
