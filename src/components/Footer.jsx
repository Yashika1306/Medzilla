import { NavLink } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      className="mt-12 border-t"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #22D3EE)' }}
              >M</div>
              <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>Medzilla</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#445878' }}>
              A free tool to help you understand, dispute, and reduce your medical bill.
              Built by someone who needed it.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#445878' }}>Navigate</p>
            <div className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/analyze', label: 'Analyze My Bill' },
                { to: '/survive', label: 'My Plan' },
                { to: '/letters', label: 'Letters' },
                { to: '/profile', label: 'Profile & Settings' },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className="block text-xs transition-colors hover:text-white"
                  style={{ color: '#5c7090' }}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Privacy & Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#445878' }}>Privacy & Legal</p>
            <div className="space-y-2 text-xs leading-relaxed" style={{ color: '#5c7090' }}>
              <p>Your bill data never leaves your device. No servers, no accounts, no uploads.</p>
              <p>
                <strong style={{ color: '#7a8fa8' }}>Disclaimer:</strong> Medzilla is not a law firm and does not provide legal or medical advice.
                Information is for educational purposes only. Always consult a qualified professional for your specific situation.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#445878' }}
        >
          <p>© {new Date().getFullYear()} Medzilla · Free forever · Nothing leaves your device</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>All processing happens in your browser</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
