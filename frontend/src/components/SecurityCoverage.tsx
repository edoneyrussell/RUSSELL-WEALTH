import { useEffect, useState } from 'react';
import { ShieldCheck, LockKeyhole, Activity } from 'lucide-react';

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

export default function SecurityCoverage() {
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch('/api/security/coverage', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Security coverage unavailable (${response.status})`);
        }

        const result: CoverageResponse = await response.json();

        if (!result.success) {
          throw new Error('Security coverage response was unsuccessful');
        }

        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Coverage unavailable');
        }
      }
    }

    refresh();

    const timer = window.setInterval(refresh, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const cards = [
    {
      title: 'Authentication',
      icon: LockKeyhole,
      value: data?.authentication
    },
    {
      title: 'Access Control',
      icon: ShieldCheck,
      value: data?.access_control
    },
    {
      title: 'Event Monitoring',
      icon: Activity,
      value: data?.event_monitoring
    }
  ];

  return (
    <section className="bg-[#14171c] border border-[#30343b] rounded-[14px] p-[18px] w-full lg:flex-1 min-w-0">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-[#f5f5f5] text-[20px] font-semibold">
          Security Coverage
        </h3>

        <span className="text-[#8c929c] text-[11px] whitespace-nowrap">
          Live · 5s
        </span>
      </div>

      {error && (
        <p className="text-[#ff6b73] text-[12px] mb-3" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ title, icon: Icon, value }) => {
          const status = error
            ? 'UNAVAILABLE'
            : value?.status ?? 'LOADING';

          const color =
            status === 'ACTIVE'
              ? '#25e487'
              : status === 'PARTIAL'
                ? '#f5b942'
                : '#8c929c';

          return (
            <div
              key={title}
              className="bg-[#1a1d22] border border-[#30343b] rounded-[12px] min-w-0 p-4 flex flex-col items-center justify-center gap-3 text-center"
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
                  ? `${value.checks_passed}/${value.checks_total} checks`
                  : 'No verified results'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[#8c929c] text-[10px] mt-3">
        Application-level configuration checks · Not a security audit
      </p>
    </section>
  );
}
