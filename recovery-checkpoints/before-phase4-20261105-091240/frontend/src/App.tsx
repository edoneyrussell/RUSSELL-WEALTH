import GlobalToastHost from './components/GlobalToastHost'
import HelpSupport from './screens/HelpSupport'
import CustomerSettings from './screens/CustomerSettings'
import AdminSettings from './screens/AdminSettings'
import RegistrationForm from './screens/RegistrationForm'
import RWPersistentNav from './components/RWPersistentNav'
import About from './screens/About'
import UnifiedMobileNav from './components/UnifiedMobileNav'
import Markets from './screens/Markets'

import { useEffect, useState, type MouseEvent } from 'react'
import ForgotPassword from './screens/ForgotPassword'
import Dashboard from './screens/Dashboard'
import Incident from './screens/Incident'
import Landing from './screens/Landing'
import MobileDashboard from './screens/MobileDashboard'
import MobileLanding from './screens/MobileLanding'
import MobileLogin from './screens/MobileLogin'
import Portfolio from './screens/Portfolio'
import Transactions from './screens/Transactions'
import SecurityDashboard from './screens/SecurityDashboard'

const routes = {
  '/help': HelpSupport,
  '/': Landing,
  '/about': About,
  '/create-account': RegistrationForm,
  '/forgot-password': ForgotPassword,
  '/dashboard': Dashboard,
  '/portfolio': Portfolio,
  '/transactions': Transactions,
  '/markets': Markets,
  '/security': SecurityDashboard,
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
  Incidents: '/security/incidents/INC-2026-0142',
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
      ['/dashboard', '/portfolio', '/transactions', '/markets',
       '/customer/settings', '/security', '/admin/settings'].includes(path) ||
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

  const customerRoutes = ['/dashboard', '/portfolio', '/transactions', '/markets', '/customer/settings', '/help']
  const securityRoutes = [
    '/admin/settings',
    '/security',
    '/security/incidents/INC-2026-0142',
  ]

  const isCustomerRoute = customerRoutes.includes(path)
  const isSecurityRoute = securityRoutes.includes(path)
  const isProtectedRoute = isCustomerRoute || isSecurityRoute

  if (auth === null && isProtectedRoute) {
    return (
      <main className="screen-shell">
        <div className="min-h-screen bg-[#08090a] flex items-center justify-center text-[#c5cad2]">
          Verifying access...
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
      auth?.role === 'SOC_ADMIN' ? '/security' : '/dashboard'
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
      <Screen />
      <GlobalToastHost />
    </main>
    </>
  )
}
