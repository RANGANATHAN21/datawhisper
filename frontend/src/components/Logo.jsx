export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="var(--accent)" opacity="0.15"/>
        <path d="M6 10h16M6 14h10M6 18h13" stroke="var(--accent2)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="22" cy="18" r="3.5" fill="var(--accent)" opacity="0.9"/>
        <path d="M24.5 20.5l2 2" stroke="var(--accent2)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span style={{
        fontFamily: 'var(--display)',
        fontWeight: 800,
        fontSize: '1.15rem',
        letterSpacing: '-0.02em',
        color: 'var(--text)',
      }}>
        Data<span style={{ color: 'var(--accent2)' }}>Whisper</span>
      </span>
    </div>
  )
}
