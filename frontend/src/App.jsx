import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone'
import SheetSelector from './components/SheetSelector'
import PreviewPanel from './components/PreviewPanel'
import AskPanel from './components/AskPanel'
import HistoryPanel from './components/HistoryPanel'
import Logo from './components/Logo'

export default function App() {
  const [session, setSession] = useState(null)   // { session_id, sheets }
  const [activeSheet, setActiveSheet] = useState(null)
  const [tab, setTab] = useState('preview')       // 'preview' | 'ask' | 'history'
  const [history, setHistory] = useState([])

  const handleUploaded = useCallback((data) => {
    setSession(data)
    setActiveSheet(data.sheets[0]?.key ?? null)
    setTab('preview')
    setHistory([])
  }, [])

  const handleNewAnswer = useCallback((record) => {
    setHistory(h => [record, ...h])
  }, [])

  const handleFeedbackUpdate = useCallback((recordId, useful) => {
    setHistory(h => h.map(r => r.id === recordId ? { ...r, feedback: useful } : r))
  }, [])

  const handleReusePrompt = useCallback((question) => {
    setTab('ask')
    // Small delay so AskPanel mounts / is visible, then dispatch custom event
    setTimeout(() => window.dispatchEvent(new CustomEvent('reuse-prompt', { detail: question })), 50)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header session={session} onReset={() => { setSession(null); setHistory([]) }} />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 24px 60px' }}>
        {!session ? (
          <LandingUpload onUploaded={handleUploaded} />
        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <SheetSelector
              sheets={session.sheets}
              active={activeSheet}
              onChange={setActiveSheet}
            />
            <TabBar tab={tab} setTab={setTab} historyCount={history.length} />
            <div>
              {tab === 'preview' && (
                <PreviewPanel sessionId={session.session_id} sheetKey={activeSheet} />
              )}
              {tab === 'ask' && (
                <AskPanel
                  sessionId={session.session_id}
                  sheets={session.sheets}
                  activeSheet={activeSheet}
                  onAnswer={handleNewAnswer}
                />
              )}
              {tab === 'history' && (
                <HistoryPanel
                  history={history}
                  sessionId={session.session_id}
                  onFeedback={handleFeedbackUpdate}
                  onReuse={handleReusePrompt}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Header({ session, onReset }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10,10,15,0.9)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Logo />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {session && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            SESSION: {session.session_id.slice(0, 8)}
          </span>
        )}
        {session && (
          <button onClick={onReset} style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text2)', padding: '5px 14px', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--body)',
            transition: 'all 0.2s',
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            New Session
          </button>
        )}
      </div>
    </header>
  )
}

function LandingUpload({ onUploaded }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0 40px' }}>
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #e8e8f0 30%, var(--accent2) 80%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          Ask your data<br />anything.
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto', fontWeight: 300 }}>
          Upload CSV or Excel files and chat with your data using AI — no SQL, no code.
        </p>
      </div>
      <div className="fade-up-1" style={{ width: '100%', maxWidth: 600 }}>
        <UploadZone onUploaded={onUploaded} />
      </div>
      <div className="fade-up-2" style={{ display: 'flex', gap: 32, marginTop: 48, color: 'var(--text3)', fontSize: '0.82rem' }}>
        {['CSV & Excel support', 'Multi-sheet upload', 'GPT-4o-mini powered', 'No data stored'].map(f => (
          <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--green)', fontSize: '0.7rem' }}>●</span> {f}
          </span>
        ))}
      </div>
    </div>
  )
}

function TabBar({ tab, setTab, historyCount }) {
  const tabs = [
    { id: 'preview', label: 'Preview' },
    { id: 'ask', label: 'Ask AI' },
    { id: 'history', label: `History${historyCount ? ` (${historyCount})` : ''}` },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          background: 'none',
          border: 'none',
          borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          color: tab === t.id ? 'var(--accent2)' : 'var(--text2)',
          padding: '10px 18px',
          cursor: 'pointer',
          fontFamily: 'var(--display)',
          fontWeight: 600,
          fontSize: '0.88rem',
          letterSpacing: '0.01em',
          transition: 'all 0.2s',
          marginBottom: -1,
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
