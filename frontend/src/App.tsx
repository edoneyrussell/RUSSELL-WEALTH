import DemoBanking from './screens/DemoBanking'
import CustomerSidebar, { SocSidebar } from './components/CustomerSidebar'
import GlobalToastHost from './components/GlobalToastHost'
import HelpSupport from './screens/HelpSupport'
import CustomerSettings from './screens/CustomerSettings'
import AdminSettings from './screens/AdminSettings'
import RegistrationForm from './screens/RegistrationForm'
import RWPersistentNav from './components/RWPersistentNav'
import About from './screens/About'
import UnifiedMobileNav from './components/UnifiedMobileNav'
import Markets from './screens/TradeExplore'

import { useEffect, useState, type MouseEvent } from 'react'
import ForgotPassword from './screens/ForgotPassword'
import Dashboard from './screens/Dashboard'
import Incident from './screens/Incident'
import Investigations from './screens/Investigations'
import Landing from './screens/Landing'
import MobileDashboard from './screens/MobileDashboard'
import MobileLanding from './screens/MobileLanding'
import MobileLogin from './screens/MobileLogin'
import Portfolio from './screens/PortfolioExperience'
import Transactions from './screens/Transactions'
import SecurityDashboard from './screens/SecurityDashboard'
import NetworkInfrastructure from './screens/NetworkInfrastructure'
import CloudSecurity from './screens/CloudSecurity'

const routes = {
  '/help': HelpSupport,
  '/': Landing,
  '/about': About,
  '/create-account': RegistrationForm,
  '/forgot-password': ForgotPassword,
  '/dashboard': Dashboard,
  '/portfolio': Portfolio,
  '/transactions': Transactions,
  '/deposit': DemoBanking,
  '/withdraw': DemoBanking,
  '/markets': Markets,
  '/security': SecurityDashboard,
  '/security/network': NetworkInfrastructure,
  '/security/cloud': CloudSecurity,
  '/security/incidents': Incident,
  '/security/investigations': Investigations,
  '/security/incidents/INC-2026-0142': Incident,
  '/admin/settings': AdminSettings,
  '/customer/settings': CustomerSettings,
} as const

const navigationByLabel: Record<string, string> = {
  'Help & Support': '/help',
  'Sign In': '/login',
  'Create Account': '/create-account',
  Dashboard: '/dashboard',
  Portfolio: '/portfolio',
  Transactions: '/transactions',
  Markets: '/markets',
  'SOC Dashboard': '/security',
  'Cloud Security': '/security/cloud',
  Incidents: '/security/incidents',
  Investigations: '/security/investigations',
  'View Dashboard': '/dashboard',
  'Explore the Platform': '/dashboard',
  'Explore Platform': '/dashboard',
  'View Investigation': '/security/incidents/INC-2026-0142',
  'Explore Security Environment': '/security',
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)

    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function navigate(path: string) {
  if (window.location.pathname === path) return

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const isMobile = useMediaQuery('(max-width: 700px)')
  const showPublicNavigation = path === '/' || path === '/about'
  const showUnifiedMobileNav =
    isMobile &&
    (
      ['/dashboard', '/portfolio', '/transactions', '/deposit', '/withdraw', '/markets',
       '/customer/settings', '/security', '/security/incidents', '/security/investigations',
       '/security/network', '/security/cloud', '/admin/settings'].includes(path) ||
      path.startsWith('/security/incidents/')
    )


  const [auth, setAuth] = useState<{
    authenticated: boolean
    role?: string
  } | null>(null)

  useEffect(() => {
    let active = true

    fetch('/api/me', {
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          return { authenticated: false }
        }

        return response.json()
      })
      .then((data) => {
        if (active) setAuth(data)
      })
      .catch(() => {
        if (active) setAuth({ authenticated: false })
      })

    return () => {
      active = false
    }
  }, [path])

  useEffect(() => {
    const update = () => setPath(window.location.pathname)

    window.addEventListener('popstate', update)

    return () => window.removeEventListener('popstate', update)
  }, [])

  const handleNavigation = (event: MouseEvent<HTMLElement>) => {
    const target = event.target

    if (!(target instanceof HTMLElement)) return

    // Do not interfere with interactive form controls.
    if (
      target.closest(
        'input, button, form, label, select, textarea'
      )
    ) {
      return
    }

    // Allow ordinary links to handle their own navigation.
    if (target.closest('a[href]')) return

    const pathElements = event.nativeEvent.composedPath().filter(
      (item): item is HTMLElement => item instanceof HTMLElement
    )

    for (const element of pathElements) {
      const label = element.textContent?.trim()

      if (label && navigationByLabel[label]) {
        navigate(navigationByLabel[label])
        return
      }
    }
  }

  const customerRoutes = ['/dashboard', '/portfolio', '/transactions', '/deposit', '/withdraw', '/markets', '/customer/settings', '/help']
  const securityRoutes = [
    '/admin/settings',
    '/security',
    '/security/network',
    '/security/cloud',
    '/security/incidents',
    '/security/investigations',
    '/security/incidents/INC-2026-0142',
  ]

  const isCustomerRoute = customerRoutes.includes(path)
  const isSecurityRoute = securityRoutes.includes(path)
  const isProtectedRoute = isCustomerRoute || isSecurityRoute

  if (auth === null && isProtectedRoute) {
    return (
      <main className="screen-shell">
        <div
          role="status"
          aria-live="polite"
          className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080a0d] px-6"
        >
          <style>{`
            @keyframes rw-loading-pulse {
              0%, 100% { opacity: .35; transform: scaleX(.25); }
              50% { opacity: 1; transform: scaleX(1); }
            }
            @keyframes rw-loading-glow {
              0%, 100% { opacity: .55; }
              50% { opacity: 1; }
            }
            .rw-loading-bar {
              animation: rw-loading-pulse 1.8s ease-in-out infinite;
              transform-origin: center;
            }
            .rw-loading-logo {
              animation: rw-loading-glow 2.5s ease-in-out infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .rw-loading-bar, .rw-loading-logo {
                animation: none;
              }
            }
          `}</style>

          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <img
              src="/assets/c8aca.png"
              alt="Russell Wealth"
              className="rw-loading-logo object-contain max-w-[240px] max-h-[110px] mb-5"
            />

            <p className="text-[#a9b0bb] text-[10px] tracking-[0.28em] font-semibold mb-10">
              YOUR FINANCIAL PLATFORM
            </p>

            <div className="w-12 h-[2px] bg-[#c5a875] rounded-full mb-7 rw-loading-bar" />

            <h1 className="text-white text-xl font-semibold tracking-wide">
              Currently loading...
            </h1>

            <p className="text-[#929ba8] text-sm mt-3">
              Connecting to Russell Wealth services
            </p>

            <p className="text-[#626d7b] text-xs mt-8">
              Securely verifying your account
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (isProtectedRoute && !auth?.authenticated) {
    window.location.replace('/login')
    return null
  }

  if (
    (isCustomerRoute &&
      auth?.role !== 'CUSTOMER' &&
      auth?.role !== 'SOC_ADMIN') ||
    (isSecurityRoute && auth?.role !== 'SOC_ADMIN')
  ) {
    window.location.replace(
      '/dashboard'
    )
    return null
  }

  let Screen

  if (path === '/login') {
    Screen = MobileLogin
  } else if (path === '/create-account') {
    Screen = RegistrationForm
  } else if (path === '/dashboard') {
    Screen = isMobile ? MobileDashboard : Dashboard
  } else if (path === '/') {
    Screen = isMobile ? MobileLanding : Landing
  } else {
    Screen = routes[path as keyof typeof routes] ?? Landing
  }

  const mobileExperience =
    path === '/login' ||
    (isMobile &&
      (path === '/' ||
        path === '/create-account' ||
        path === '/dashboard'))

  return (
    <>
      {showPublicNavigation && <RWPersistentNav />}
      {showUnifiedMobileNav && (
        <UnifiedMobileNav
          security={
            path.startsWith('/security') ||
            path === '/admin/settings'
          }
        />
      )}

    <main
      className={
        mobileExperience
          ? 'screen-shell mobile-experience'
          : 'screen-shell'
      }
      onClick={handleNavigation}
    >
      {isSecurityRoute && !isMobile ? (
        <div className="rw-unified-customer-layout rw-unified-soc-layout">
          <SocSidebar />
          <div className="rw-unified-customer-content">
            <div key={path} className="rw-page-transition">
              <Screen />
            </div>
          </div>
        </div>
      ) : isCustomerRoute && !isMobile ? (
        <div className="rw-unified-customer-layout">
          <CustomerSidebar />
          <div className="rw-unified-customer-content">
            <div key={path} className="rw-page-transition">
              <Screen />
            </div>
          </div>
        </div>
      ) : (
        <div key={path} className="rw-page-transition">
          <Screen />
        </div>
      )}
      <GlobalToastHost />
    </main>
    </>
  )
}
