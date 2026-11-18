import { welcomeScreenLoaders } from './onboarding/preload';
import { sharedFetch } from './experience/sharedFetch';
import { useScrollMemory } from './experience/useScrollMemory';
import { clearViewMemory } from './experience/ViewState';
import LoadingProgress from './components/LoadingProgress';
import SignInLocationPrompt from './components/SignInLocationPrompt';
import { landingContent } from "./content/landingContent"
import { getLanguage, sourceText, t } from './i18n/language.ts'
import CustomerSidebar, { SocSidebar } from './components/CustomerSidebar'
import GlobalToastHost from './components/GlobalToastHost'
import RWPersistentNav from './components/RWPersistentNav'
import UnifiedMobileNav from './components/UnifiedMobileNav'

import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react'
import { ConnectionNotice, PageBoundary, PageSkeleton } from './experience/Feedback';
import Landing from './screens/Landing'

const WelcomeTour = lazy(() => import('./onboarding/WelcomeTour'));
const ActiveSessions = lazy(() => import('./screens/ActiveSessions'));
const CustomerDemo = lazy(() => import('./screens/CustomerDemo'));
const SecurityDemo = lazy(() => import('./screens/SecurityDemo'));
const DemoBanking = lazy(welcomeScreenLoaders.DemoBanking);
const Accounts = lazy(welcomeScreenLoaders.Accounts);
const WatchlistOverlay = lazy(() => import('./components/WatchlistOverlay'));
const HelpSupport = lazy(() => import('./screens/HelpSupport'));
const CustomerSettings = lazy(welcomeScreenLoaders.CustomerSettings);
const CustomerAccountManagement = lazy(() => import('./screens/CustomerAccountManagement'));
const CustomerActivity = lazy(() => import('./screens/CustomerActivity'));
const AdminSettings = lazy(() => import('./screens/AdminSettings'));
const RegistrationForm = lazy(() => import('./screens/RegistrationForm'));
const About = lazy(() => import('./screens/About'));
const Markets = lazy(welcomeScreenLoaders.Markets);
const ForgotPassword = lazy(() => import('./screens/ForgotPassword'));
const Dashboard = lazy(welcomeScreenLoaders.Dashboard);
const Incident = lazy(() => import('./screens/Incident'));
const MobileDashboard = lazy(() => import('./screens/MobileDashboard'));
const MobileLanding = lazy(() => import('./screens/MobileLanding'));
const MobileLogin = lazy(() => import('./screens/MobileLogin'));
const Portfolio = lazy(welcomeScreenLoaders.Portfolio);
const Transactions = lazy(welcomeScreenLoaders.Transactions);
const SecurityDashboard = lazy(() => import('./screens/SecurityDashboard'));
const NetworkInfrastructure = lazy(() => import('./screens/NetworkInfrastructure'));
const AccessManagement = lazy(() => import('./screens/AccessManagement'));

const routes = {
  '/demo/security': SecurityDemo,
  '/demo/customer': CustomerDemo,
  '/help': HelpSupport,
  '/': Landing,
  '/about': About,
  '/create-account': RegistrationForm,
  '/forgot-password': ForgotPassword,
  '/reset-password': ForgotPassword,
  '/dashboard': Dashboard,
  '/portfolio': Portfolio,
  '/accounts': Accounts,
  '/transactions': Transactions,
  '/deposit': DemoBanking,
  '/withdraw': DemoBanking,
  '/markets': Markets,
  '/security': SecurityDashboard,
  '/security/network': NetworkInfrastructure,
  '/security/access': AccessManagement,
  '/security/sessions': ActiveSessions,
  '/security/incidents': Incident,
  '/security/incidents/INC-2026-0142': Incident,
  '/admin/settings': AdminSettings,
  '/customer/settings': CustomerSettings,
  '/customer/account-settings': CustomerAccountManagement,
  '/customer/activity': CustomerActivity,
} as const

const navigationByLabel: Record<string, string> = {
  'Help & Support': '/help',
  [landingContent.signIn]: '/login',
  'Create Account': '/create-account',
  Dashboard: '/dashboard',
  Portfolio: '/portfolio',
  Transactions: '/transactions',
  Markets: '/markets',
  'SOC Dashboard': '/security',
  Incidents: '/security/incidents',
  'View Dashboard': '/dashboard',
  [landingContent.exploreThePlatform]: '/demo/customer',
  [landingContent.explorePlatform]: '/demo/customer',
  'View Investigation': '/security/incidents/INC-2026-0142',
  [landingContent.exploreSecurityEnvironment]: '/demo/security',
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)

    media.addEventListener('change', update)
    update()

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

function currentPath() {
  if (['/security/investigations', '/security/cloud'].includes(window.location.pathname)) {
    window.history.replaceState({}, '', '/security')
  }
  return window.location.pathname
}

export default function App() {
  const [language, setLanguage] = useState(getLanguage);
  useEffect(() => {
    const update = (event: Event) => setLanguage((event as CustomEvent<'en' | 'fr'>).detail);
    window.addEventListener('rw-language-changed', update);
    return () => window.removeEventListener('rw-language-changed', update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('Russell Wealth | Where Wealth Meets Innovation');
  }, [language]);
  const [path, setPath] = useState(currentPath)
  const [hash, setHash] = useState(() => window.location.hash)
  useScrollMemory(path + window.location.search + hash);
  const isMobile = useMediaQuery('(max-width: 700px)')
  const showPublicNavigation = path === '/' || path === '/about'
  const showUnifiedMobileNav =
    isMobile &&
    (
      ['/accounts', '/dashboard', '/portfolio', '/transactions', '/deposit', '/withdraw', '/markets',
       '/customer/settings', '/customer/activity', '/customer/account-settings', '/security', '/security/incidents',
       '/security/network', '/security/access', '/security/sessions', '/admin/settings'].includes(path) ||
      path.startsWith('/security/incidents/')
    )


  const [auth, setAuth] = useState<{
    authenticated: boolean
    role?: string
    roles?: string[]
  } | null>(null)

  useEffect(() => {
    if (!auth?.authenticated || path.startsWith('/demo/')) return;
    const ping=async()=>{try{const response=await sharedFetch('/api/me/session-heartbeat',{credentials:'include',cache:'no-store'});if(response.status===401)window.location.replace('/login');}catch{/* Retry on the next heartbeat. */}};
    const visible=()=>{if(document.visibilityState==='visible')void ping();};
    const timer=window.setInterval(visible,60000);
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
  },[auth?.authenticated,path]);

  useEffect(() => {
    let active = true
    if (path.startsWith('/demo/')) {
      setAuth({ authenticated: false })
      return () => { active = false }
    }

    sharedFetch('/api/me?include_photo=0', {
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          try {clearViewMemory();} catch {}
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
    const update = () => {
      setPath(currentPath())
      setHash(window.location.hash)
    }

    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)

    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
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
      const label = sourceText(element).trim()

      if (label && navigationByLabel[label]) {
        navigate(navigationByLabel[label])
        return
      }
    }
  }

  const customerRoutes = ['/accounts', '/dashboard', '/portfolio', '/transactions', '/deposit', '/withdraw', '/markets', '/customer/settings', '/customer/activity', '/customer/account-settings', '/help']
  const securityRoutes = [
    '/admin/settings',
    '/security',
    '/security/network',
    '/security/access',
    '/security/sessions',
    '/security/incidents',
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
          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <img
              src="/assets/c8aca.png"
              alt="Russell Wealth"
              className="rw-loading-logo object-contain max-w-[240px] max-h-[110px] mb-5"
            />

            <p className="text-[#a9b0bb] text-[10px] tracking-[0.28em] font-semibold mb-10">
              YOUR FINANCIAL PLATFORM
            </p>

            <LoadingProgress inline />

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
    window.location.replace('/')
    return null
  }

  const roles = auth?.roles ?? (auth?.role ? [auth.role] : [])
  const customerAccess = roles.includes('CUSTOMER')
  const socAccess = roles.includes('SOC_ADMIN')

  if (
    (isCustomerRoute && !customerAccess) ||
    (isSecurityRoute && !socAccess)
  ) {
    window.location.replace(
      socAccess ? '/security' : '/dashboard'
    )
    return null
  }

  let Screen

  if (path === '/login') {
    Screen = MobileLogin
  } else if (path === '/create-account') {
    Screen = RegistrationForm
  } else if (path === '/dashboard') {
    Screen = hash === '#watchlist' ? WatchlistOverlay : isMobile ? MobileDashboard : Dashboard
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
    <div key={language} className={isSecurityRoute ? "contents rw-soc-theme" : "contents"}>
      {isProtectedRoute && auth?.authenticated && <SignInLocationPrompt />}
      {isCustomerRoute && customerAccess && <Suspense fallback={null}><WelcomeTour /></Suspense>}
      <ConnectionNotice />
      {showPublicNavigation && <RWPersistentNav />}
      {isProtectedRoute && customerAccess && socAccess && (
        <nav aria-label="Switch dashboard" className="flex justify-end gap-3 border-b border-[#30343b] bg-[#10151C] px-5 py-2 text-sm text-[#BAD9EF]">
          <a href="/dashboard" className="rounded px-3 py-2 hover:bg-[#202833]" aria-current={isCustomerRoute ? 'page' : undefined}>Customer Dashboard</a>
          <a href="/security" className="rounded px-3 py-2 hover:bg-[#202833]" aria-current={isSecurityRoute ? 'page' : undefined}>SOC Dashboard</a>
        </nav>
      )}
      {showUnifiedMobileNav && (
        <UnifiedMobileNav
          security={
            path.startsWith('/security') ||
            path === '/admin/settings'
          }
          settingsPlacement={path === '/customer/settings'}
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
              <PageBoundary key={path}><Suspense fallback={<PageSkeleton />}><Screen /></Suspense></PageBoundary>
            </div>
          </div>
        </div>
      ) : isCustomerRoute && !isMobile ? (
        <div className="rw-unified-customer-layout">
          <CustomerSidebar />
          <div className="rw-unified-customer-content">
            <div key={path} className="rw-page-transition">
              <PageBoundary key={path}><Suspense fallback={<PageSkeleton />}><Screen /></Suspense></PageBoundary>
            </div>
          </div>
        </div>
      ) : (
        <div key={path} className="rw-page-transition">
          <PageBoundary key={path}><Suspense fallback={<PageSkeleton />}><Screen /></Suspense></PageBoundary>
        </div>
      )}
      <GlobalToastHost />
    </main>
    </div>
  )
}
