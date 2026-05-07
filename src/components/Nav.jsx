import { NavLink, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',        label: 'Home',     end: true,  icon: HomeIcon },
  { to: '/analyze', label: 'Analyze',  end: false, icon: ScanIcon },
  { to: '/survive', label: 'My Plan',  end: false, icon: PlanIcon },
  { to: '/letters', label: 'Letters',  end: false, icon: LetterIcon },
  { to: '/profile', label: 'Profile',  end: false, icon: ProfileIcon },
]

export default function Nav() {
  const location = useLocation()
  const isAnalyze = location.pathname.includes('/analyze')

  return (
    <>
      {/* ── Desktop / top nav ── */}
      <nav
        className="sticky top-0 z-40 hidden sm:block"
        style={{
          background: 'rgba(11, 19, 38, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #22D3EE)' }}
            >M</div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Medzilla
            </span>
            <span className="hidden md:inline text-xs font-normal" style={{ color: '#445878' }}>
              — know before you pay
            </span>
          </NavLink>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* AI active badge — shown on analyze page */}
            {isAnalyze && (
              <span
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mr-2"
                style={{
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.25)',
                  color: '#4ade80',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Free &amp; Private
              </span>
            )}

            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'text-white'
                      : 'hover:text-white'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'rgba(124,58,237,0.18)',
                  color: '#a78bfa',
                  border: '1px solid rgba(124,58,237,0.3)',
                } : {
                  color: '#94A3B8',
                }}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar (logo only) ── */}
      <nav
        className="sm:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(11, 19, 38, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <NavLink to="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #22D3EE)' }}
          >M</div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>Medzilla</span>
        </NavLink>
        {isAnalyze && (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.25)',
              color: '#4ade80',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Free &amp; Private
          </span>
        )}
      </nav>

      {/* ── Mobile bottom nav ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
        style={{
          background: 'rgba(11, 19, 38, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {NAV_LINKS.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150"
            style={({ isActive }) => isActive ? {
              color: '#a78bfa',
            } : {
              color: '#4a5a72',
            }}
          >
            <Icon />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </>
  )
}

/* ── Icon components ── */
function HomeIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function ScanIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}
function PlanIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function LetterIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
