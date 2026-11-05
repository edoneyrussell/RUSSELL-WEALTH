import { useEffect, useState } from 'react';

export type SecurityEvent = {
  id: number;
  user_id: number | null;
  email: string | null;
  event_type: string;
  source_ip: string | null;
  severity: string;
  details: string | null;
  created_at: string;
};

export type SecurityOverview = {
  success: boolean;
  metrics: {
    total_events: number;
    successful_logins: number;
    failed_logins: number;
    blocked_attempts: number;
  open_incidents?: number;
  total_incidents?: number;
  resolved_incidents?: number;
    info_events: number;
    warning_events: number;
    critical_events: number;
  };
  recent_events: SecurityEvent[];
  top_sources: {
    source_ip: string;
    event_count: number;
  }[];
};

export function useSecurityOverview() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch('/api/security/overview', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Security API returned ${response.status}`);
        }

        const result: SecurityOverview = await response.json();

        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load security data');
        }
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return { data, error };
}
