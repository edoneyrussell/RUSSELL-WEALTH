import { getLocale } from '../i18n/language';
import { SecurityDemoContext, useSecurityFetch } from "../demo/securityDemo";
import { useEffect, useState, useContext } from 'react';
import { ShieldCheck, LockKeyhole, Activity, ArrowUpRight } from 'lucide-react';

type CoverageStatus = {
  status: string;
  checks_passed: number;
  checks_total: number;
  checks: Record<string, boolean>;
};

type CoverageResponse = {
  success: boolean;
  authentication: CoverageStatus;
  access_control: CoverageStatus;
  event_monitoring: CoverageStatus;
};

const checkLabels: Record<string, string> = {
  password_verification_available: 'Password verification function is available',
  http_only_cookies: 'Session cookies are configured as HTTP-only',
  same_site_configured: 'Session cookies use SameSite Lax or Strict',
  role_authorization_available: 'Role authorization function is available',
  authenticated_soc_session: 'This request has an authenticated SOC session',
  logging_function_available: 'Security event logging function is available',
  event_table_accessible: 'The security event table can be queried',
};

export default function SecurityCoverage() {
  const securityFetch = useSecurityFetch();
  const demo = useContext(SecurityDemoContext);
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let pending=false;
    const controller=new AbortController();

    async function refresh() {
      if(pending)return;pending=true;
      try {
        const response = await securityFetch('/api/security/coverage', {
          credentials: 'include',
          cache: 'no-store',signal:controller.signal
        });

        if (!response.ok) {
          throw new Error(`Security coverage unavailable (${response.status})`);
        }

        const result: CoverageResponse = await response.json();

        if (!result.success || ![result.authentication, result.access_control, result.event_monitoring].every(value => value && value.checks && Object.values(value.checks).every(check => typeof check === 'boolean'))) {
          throw new Error('Security coverage response was unsuccessful');
        }

        if (active) {
          setData(result);
          setCheckedAt(new Date().toISOString());
          setError(null);
        }
      } catch (err) {
        if (active) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Coverage unavailable');
        }
      } finally {pending=false;}
    }

    refresh();

    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    const timer = window.setInterval(visible, 60000);
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);

    return () => {
      active = false;controller.abort();
      window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);
      window.clearInterval(timer);
    };
  }, []);

  const cards = [
    {
      title: 'Authentication',
      icon: LockKeyhole,
      value: data?.authentication,
      href: demo ? '/demo/security?section=Active%20Sessions' : '/security/sessions',
      action: 'Open Active Sessions',
      description: 'Review signed-in devices and revoke an individual session.'
    },
    {
      title: 'Access Control',
      icon: ShieldCheck,
      value: data?.access_control,
      href: demo ? '/demo/security?section=Access' : '/security/access',
      action: 'Open Access Management',
      description: 'Review account roles, access permissions, and account status.'
    },
    {
      title: 'Event Monitoring',
      icon: Activity,
      value: data?.event_monitoring,
      href: demo ? '/demo/security?panel=logs' : '/security?panel=logs',
      action: 'Open Security Logs',
      description: 'Investigate recorded security activity, sources, and locations.'
    }
  ];

  return (
    <section data-tour="soc-coverage" className="rw-security-coverage bg-[#14171c] border border-[#30343b] rounded-[14px] p-[18px] w-full lg:flex-1 min-w-0">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-[#f5f5f5] text-[20px] font-semibold">
          Security Coverage
        </h3>

        <span className="text-[#8c929c] text-[11px] whitespace-nowrap">
          {demo ? 'Demo dataset' : 'Live · 60s'}
        </span>
      </div>

      {error && (
        <p className="text-[#ff6b73] text-[12px] mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ title, icon: Icon, value, href, action, description }) => {
          const checks = value ? Object.entries(value.checks) : [];
          const passed = checks.filter(([,result]) => result).length;
          const status = error ? 'Unavailable' : !value ? 'Loading' : checks.length && passed === checks.length ? 'Checks passed' : passed ? 'Some checks failed' : 'Checks failed';
          const color = error || !value ? '#8c929c' : checks.length && passed === checks.length ? '#25e487' : '#f5b942';

          return (
            <a
              key={title}
              href={href}
              aria-label={`${title}: ${action}`}
              title={description}
              className="rw-security-coverage-check bg-[#1a1d22] border border-[#30343b] rounded-[12px] min-w-0 p-4 flex flex-col items-center justify-center gap-3 text-center"
            >
              <Icon size={28} color={color} strokeWidth={1.8} />

              <span className="text-[#b4b8c0] text-[12px] font-medium">
                {title}
              </span>

              <span
                className="text-[13px] font-semibold"
                style={{ color }}
              >
                {status}
              </span>

              <span className="text-[#8c929c] text-[11px]">
                {value && !error
                  ? `${passed}/${checks.length} checks`
                  : 'No verified results'}
              </span>
              <span className="rw-coverage-action flex items-center gap-1 text-[11px] text-[#c2edce]">{action}<ArrowUpRight size={13} aria-hidden="true" /></span>
            </a>
          );
        })}
      </div>

      <details className="mt-4 border-t border-[#30343b] pt-3 text-xs">
        <summary className="cursor-pointer rounded py-2 text-[#c2edce]">View actual coverage checks</summary>
        <div className="mt-3 space-y-4">
          {cards.map(({title,value,description}) => <section key={title}>
            <h4 className="font-semibold text-[#ecf1ed]">{title}</h4>
            <p className="mt-1 leading-5 text-[#91a498]">{description}</p>
            {value && !error ? <ul className="mt-2 space-y-2">
              {Object.entries(value.checks).map(([key,passed]) => <li key={key} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-[#b4cbbd]">{checkLabels[key] || key.replaceAll('_',' ')}</span>
                <span className={`shrink-0 ${passed ? 'text-[#78cba2]' : 'text-[#f5b942]'}`}>{passed ? 'Passed' : 'Failed'}</span>
              </li>)}
            </ul> : <p className="mt-2 text-[#91a498]">No verified results</p>}
          </section>)}
        </div>
        <p className="mt-4 leading-5 text-[#91a498]">These checks report application configuration and database accessibility. They do not verify MFA, resistance to attacks, log completeness, or production security effectiveness.</p>
      </details>
      <p className="text-[#8c929c] text-[10px] mt-3">
        {demo ? 'Simulated checks · Fictional demo data' : 'Live application configuration checks · Not a security audit'}
      </p>
      {!demo && checkedAt && !error && <p className="mt-1 text-[10px] text-[#8c929c]">Last successful check: <time dateTime={checkedAt}>{new Date(checkedAt).toLocaleTimeString(getLocale())}</time></p>}
    </section>
  );
}
