import { useState } from 'react'

const customerLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Trade', href: '/dashboard#trade' },
  { label: 'Watchlist', href: '/dashboard#watchlist' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Markets', href: '/markets' },
  { label: 'Settings', href: '/customer/settings' },
]

const securityLinks = [
  { label: 'SOC Dashboard', href: '/security' },
  { label: 'Incidents', href: '/security/incidents/INC-2026-0142' },
  { label: 'Admin Settings', href: '/admin/settings' },
]

export default function UnifiedMobileNav({
  security = false,
}: {
  security?: boolean
}) {
  const [open, setOpen] = useState(false)
  const links = security ? securityLinks : customerLinks
  const current = window.location.pathname

  return (
    <div
      className="rw-unified-mobile-nav"
      style={{
        position: 'fixed',
        right: 16,
        top: 16,
        zIndex: 9999,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <button
        type="button"
        aria-label="Open Russell Wealth navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          background: '#14171c',
          color: '#f5f5f5',
          border: '1px solid #30343b',
          borderRadius: 10,
          padding: '11px 15px',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 6px 24px rgba(0,0,0,.35)',
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <nav
          aria-label="Russell Wealth mobile navigation"
          style={{
            position: 'absolute',
            right: 0,
            top: 52,
            width: 230,
            maxHeight: '75vh',
            overflowY: 'auto',
            background: '#14171c',
            border: '1px solid #30343b',
            borderRadius: 12,
            padding: 8,
            boxShadow: '0 16px 40px rgba(0,0,0,.55)',
          }}
        >
          {links.map(link => {
            const active = current === link.href.split('#')[0]
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block',
                  padding: '13px 14px',
                  borderRadius: 8,
                  color: active ? '#ffffff' : '#b4b8c0',
                  background: active ? '#252a31' : 'transparent',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </a>
            )
          })}
        </nav>
      )}
    </div>
  )
}
