import * as React from 'react';
import { useEffect, useState } from 'react';
import type { SecurityEvent } from '../hooks/useSecurityOverview';

type Props = {
  onClose: () => void;
};

type ResponseData = {
  success: boolean;
  logs: SecurityEvent[];
  active_count: number;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

function reginaTime(value: string) {
  const normalized = value.trim().replace(' ', 'T');
  const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : normalized + 'Z';
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return { date: '—', time: '—' };
  }

  return {
    date: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Regina',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Regina',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date)
  };
}


function ClearSecurityAlertsButton() {
  const [clearing, setClearing] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function clearAlerts() {
    setClearing(true);
    setMessage('');

    try {
      const response = await fetch('/api/security/clear-alerts', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Unable to clear alerts (${response.status})`);
      }

      setMessage('Active alerts cleared.');

      window.dispatchEvent(new Event('security-alerts-cleared'));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to clear alerts'
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={clearAlerts}
        disabled={clearing}
        className="rounded-lg bg-[#8f202b] px-4 py-2 text-sm font-medium text-white hover:bg-[#a52b38] disabled:opacity-50"
      >
        {clearing ? 'Clearing...' : 'Clear Alerts'}
      </button>
      {message && (
        <span className="text-xs text-[#b4b8c0]">{message}</span>
      )}
    </div>
  );
}

export default function SecurityAlerts({ onClose }: Props) {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [data, setData] = useState<ResponseData | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: '25',
          event_type: 'LOGIN_FAILED'
        });

        if (severity) params.set('severity', severity);

        const response = await fetch(
          `/api/security/alerts?${params.toString()}`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`Alerts API returned ${response.status}`);
        }

        const result: ResponseData = await response.json();

        if (!result.success) {
          throw new Error('Unable to retrieve alerts');
        }

        setData(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 5000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [page, severity]);

  return (
    <div className="fixed inset-0 z-[5000] bg-[#080a0d] overflow-y-auto p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-6">

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[#8c929c] text-xs mb-2">
              RUSSELL WEALTH / SOC OPERATIONS
            </p>
            <h1 className="text-[#f5f5f5] text-3xl font-semibold">
              Security Alerts
            </h1>
          <ClearSecurityAlertsButton />
            <p className="text-[#8c929c] text-sm mt-2">
              Failed login activity · Regina time (CST) · Live 5s refresh
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-[#30343b] rounded-lg px-4 py-2 text-[#f5f5f5] hover:bg-[#292e36]"
          >
            ← SOC Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#14171c] border border-[#30343b] rounded-xl p-5">
            <p className="text-[#8c929c] text-xs">Recorded Alerts</p>
            <p className="text-[#f5f5f5] text-3xl font-semibold mt-3">
              {data?.pagination.total ?? '—'}
            </p>
          </div>

          <div className="bg-[#14171c] border border-[#30343b] rounded-xl p-5">
            <p className="text-[#8c929c] text-xs">Active Alerts</p>
            <p className="text-[#f5f5f5] text-3xl font-semibold mt-3">
              {data?.active_count ?? '—'}
            </p>
          </div>

          <div className="bg-[#14171c] border border-[#30343b] rounded-xl p-5">
            <p className="text-[#8c929c] text-xs">Data Source</p>
            <p className="text-[#25e487] text-lg font-semibold mt-3">
              Security Alerts Database
            </p>
          </div>
        </div>

        <div className="bg-[#14171c] border border-[#30343b] rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div>
              <h2 className="text-[#f5f5f5] text-lg font-semibold">
                Alert Activity
              </h2>
              <p className="text-[#8c929c] text-xs mt-1">
                Select an alert to inspect its recorded details
              </p>
            </div>

            <select
              value={severity}
              onChange={e => {
                setSeverity(e.target.value);
                setPage(1);
                setSelectedId(null);
              }}
              className="bg-[#1a1d22] border border-[#30343b] text-[#f5f5f5] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All severities</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          {error && (
            <p className="text-[#ff454f] text-sm mb-4">{error}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#1a1d22] text-[#8c929c]">
                <tr>
                  {[
                    'Severity',
                    'Date (Regina)',
                    'Time (CST)',
                    'Alert',
                    'Account',
                    'Source IP',
                    'Event ID'
                  ].map(label => (
                    <th key={label} className="px-3 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data?.logs.map(event => {
                  const timestamp = reginaTime(event.created_at);
                  const expanded = selectedId === event.id;

                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedId(expanded ? null : event.id)}
                      className="border-b border-[#30343b] hover:bg-[#1a1d22] cursor-pointer align-top"
                    >
                      <td className="px-3 py-4">
                        <span className={
                          event.severity === 'CRITICAL'
                            ? 'text-[#ff454f]'
                            : event.severity === 'WARNING'
                              ? 'text-[#f5b942]'
                              : 'text-[#25e487]'
                        }>
                          ● {event.severity}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-[#b4b8c0]">
                        {timestamp.date}
                      </td>
                      <td className="px-3 py-4 text-[#b4b8c0]">
                        {timestamp.time}
                      </td>
                      <td className="px-3 py-4 text-[#f5f5f5]">
                        Failed Login Attempt

                        {expanded && (
                          <div className="mt-4 p-4 rounded-lg bg-[#0b0d11] border border-[#30343b] text-[#b4b8c0] text-xs space-y-2">
                            <p className="text-[#f5f5f5] font-semibold">
                              Investigation Details
                            </p>
                            <p>Event: {event.event_type}</p>
                            <p>Account: {event.email ?? 'Unknown'}</p>
                            <p>Source IP: {event.source_ip ?? 'Unknown'}</p>
                            <p>Severity: {event.severity}</p>
                            <p>Details: {event.details ?? 'None recorded'}</p>
                            <p>Recorded UTC: {event.created_at}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-[#b4b8c0]">
                        {event.email ?? 'Unknown'}
                      </td>
                      <td className="px-3 py-4 text-[#b4b8c0]">
                        {event.source_ip ?? 'Unknown'}
                      </td>
                      <td className="px-3 py-4 text-[#8c929c]">
                        #{event.id}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && (
              <p className="text-[#8c929c] text-sm text-center py-8">
                Loading alerts...
              </p>
            )}

            {!loading && !error && data?.logs.length === 0 && (
              <p className="text-[#8c929c] text-sm text-center py-8">
                No matching alerts recorded.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-[#8c929c] text-sm">
              Page {data?.pagination.page ?? page} of{' '}
              {Math.max(1, data?.pagination.total_pages ?? 1)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => {
                  setPage(p => p - 1);
                  setSelectedId(null);
                }}
                className="border border-[#30343b] rounded-lg px-4 py-2 text-[#f5f5f5] disabled:opacity-30"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={loading || page >= (data?.pagination.total_pages ?? 1)}
                onClick={() => {
                  setPage(p => p + 1);
                  setSelectedId(null);
                }}
                className="border border-[#30343b] rounded-lg px-4 py-2 text-[#f5f5f5] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
