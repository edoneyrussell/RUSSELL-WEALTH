import { useSecurityFetch } from "../demo/securityDemo";
import { useEffect, useState } from 'react';

export type SecurityEvent = {
  location?: string;
  accuracy_m?: number;
  location_permission?: string;
  location_basis?: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  assigned_user_id?: number | null;
  assigned_at?: string | null;
  assigned_name?: string | null;
  assigned_email?: string | null;
  workflow_version?: number;
  is_overdue?: boolean;
  due_at?: string | null;
  escalated_at?: string | null;
  escalation_ack_at?: string | null;
  title?: string;
  status?: string;
  evidence?: { id: number; account_email: string | null; event_type: string; source_ip: string | null; created_at: string }[];
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
  threat_trends?: {hour: string; total: number; failed: number; successful: number}[];
  recent_events: SecurityEvent[];
  top_sources: {
    source_ip: string;
    event_count: number;
  }[];
};

export function useSecurityOverview() {
  const securityFetch = useSecurityFetch();
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await securityFetch('/api/security/overview', {
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

    window.addEventListener('rw-location-updated', refresh);
    refresh();
    const interval = window.setInterval(refresh, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('rw-location-updated', refresh);
    };
  }, []);

  return { data, error };
}
