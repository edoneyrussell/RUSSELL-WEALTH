import { useSecurityFetch } from "../demo/securityDemo";
import { useEffect, useState } from 'react';
import type { SecurityEvent } from '../hooks/useSecurityOverview';

type Props = {
  onClose: () => void;
};

type LogsResponse = {
  success: boolean;
  logs: (SecurityEvent & { source: string; source_label: string; event_key: string })[];
  sources: { key: string; label: string; status: string; count: number | null }[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

function reginaDateTime(value: string) {
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

export default function AllSecurityLogs({ onClose }: Props) {
  const securityFetch = useSecurityFetch();
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event'));

  useEffect(() => {
    const controller = new AbortController();

    let inFlight = false;
    setLoading(true);
    async function loadLogs() {
      if (inFlight) return;
      inFlight = true;
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: '25'
        });

        if (eventType) params.set('event_type', eventType);
        if (severity) params.set('severity', severity);
        if (search.trim()) params.set('search', search.trim());

        const response = await securityFetch(
          `/api/security/logs?${params.toString()}`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`Security logs API returned ${response.status}`);
        }

        const result: LogsResponse = await response.json();

        if (!result.success) {
          throw new Error('Unable to retrieve security logs');
        }

        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    const initial = window.setTimeout(() => void loadLogs(), 200);
    const refresh = () => { if (!document.hidden) void loadLogs(); };
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [page, eventType, severity, search]);

  return (
    <div className="rw-security-logs fixed inset-0 z-[5000] bg-[#080a0d] overflow-y-auto p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="rw-security-logs-header flex items-center justify-between gap-4">
          <div>
            <p className="text-[#8c929c] text-xs mb-2">
              RUSSELL WEALTH / SECURITY OPERATIONS
            </p>
            <h1 className="text-[#f5f5f5] text-3xl font-semibold">
              All Security Logs
            </h1>
            <p className="text-[#8c929c] text-sm mt-2">
              Local and live security events · Regina time (CST) · Refreshes every 5 seconds
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-[#30343b] rounded-lg px-4 py-2 text-[#f5f5f5] hover:bg-[#292e36]"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="rw-security-logs-panel bg-[#14171c] border border-[#30343b] rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="rw-security-logs-filters flex flex-wrap gap-3">
              <input aria-label="Search security logs" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search names, emails, IPs or events…" className="bg-[#1a1d22] text-[#f5f5f5] border border-[#30343b] rounded-lg px-3 py-2 text-sm" />
              <select
                aria-label="Filter log event type"
                value={eventType}
                onChange={e => {
                  setEventType(e.target.value);
                  setPage(1);
                }}
                className="bg-[#1a1d22] text-[#f5f5f5] border border-[#30343b] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All event types</option>
                <option value="LOGIN_SUCCESS">Successful logins</option>
                <option value="LOGIN_FAILED">Failed logins</option>
              </select>

              <select
                aria-label="Filter log severity"
                value={severity}
                onChange={e => {
                  setSeverity(e.target.value);
                  setPage(1);
                }}
                className="bg-[#1a1d22] text-[#f5f5f5] border border-[#30343b] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All severities</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <span className="text-[#b4b8c0] text-sm">
              {data?.pagination.total ?? 0} matching events
            </span>
          </div>

          <div aria-label="Security log sources" className="mb-4 flex flex-wrap gap-3 text-xs">
            {data?.sources.map(source => <span key={source.key} className={source.status === 'connected' ? 'text-[#91A1B4]' : 'text-[#f5b942]'}>{source.label}: {source.status === 'connected' ? `${source.count} matching events` : 'Unavailable — results are incomplete'}</span>)}
          </div>
          {error && (
            <p className="text-[#ff454f] text-sm mb-4">{error}</p>
          )}

          <div className="rw-security-log-cards hidden">
            {data?.logs.map(event => {
              const timestamp = reginaDateTime(event.created_at);
              return (
                <article key={event.event_key} className="rw-security-log-card">
                  <div className="rw-security-log-card-heading">
                    <h2>{event.event_type.replaceAll('_', ' ').toLowerCase()}</h2>
                    <span className={event.severity === 'CRITICAL' ? 'text-[#ff454f]' : event.severity === 'WARNING' ? 'text-[#f5b942]' : 'text-[#25e487]'}>{event.severity}</span>
                  </div>
                  <dl>
                    <div><dt>Account email</dt><dd>{event.email || (event.event_type.startsWith('LOGIN_') ? 'Email not recorded' : 'System / no account')}</dd></div>
                    <div><dt>Source IP</dt><dd>{event.source_ip || 'IP not recorded'}{(event.source_ip === '127.0.0.1' || event.source_ip === '::1') && <small>Loopback address recorded</small>}</dd></div>
                    <div><dt>Date &amp; time (CST)</dt><dd>{timestamp.date} · {timestamp.time}</dd></div>
                    <div><dt>Database · Event ID</dt><dd>{event.source_label} · #{event.id}</dd></div>
                  </dl>
                  <details open={selectedId === event.event_key || undefined}>
                    <summary>Event details</summary>
                    <p>{event.details || 'No additional details'}</p>
                    <p>User ID: {event.user_id ?? 'Unknown'}</p>
                    <p>Recorded UTC: {event.created_at}</p>
                  </details>
                </article>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="rw-security-logs-table w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#1a1d22] text-[#8c929c]">
                <tr>
                  {['ID', 'Database', 'Date (Regina)', 'Time (CST)', 'Event', 'Severity', 'Account Email', 'Source IP'].map(label => (
                    <th key={label} className="px-3 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data?.logs.map(event => {
                  const timestamp = reginaDateTime(event.created_at);
                  const selected = selectedId === event.event_key;

                  return (
                    <tr
                      key={event.event_key}
                      onClick={() => setSelectedId(selected ? null : event.event_key)}
                      className="border-b border-[#30343b] hover:bg-[#1a1d22] cursor-pointer"
                    >
                      <td className="px-3 py-3 text-[#8c929c]">
                        #{event.id}
                      </td>
                      <td className="px-3 py-3 text-[#b4b8c0]">{event.source_label}</td>
                      <td className="px-3 py-3 text-[#b4b8c0]">
                        {timestamp.date}
                      </td>
                      <td className="px-3 py-3 text-[#b4b8c0]">
                        {timestamp.time}
                      </td>
                      <td className="px-3 py-3 text-[#f5f5f5]">
                        {event.event_type}
                        {selected && (
                          <div className="text-[#8c929c] text-xs mt-2 space-y-1">
                            <p>Details: {event.details ?? 'None'}</p>
                            <p>User ID: {event.user_id ?? 'Unknown'}</p>
                            <p>Recorded UTC: {event.created_at}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={
                          event.severity === 'CRITICAL'
                            ? 'text-[#ff454f]'
                            : event.severity === 'WARNING'
                              ? 'text-[#f5b942]'
                              : 'text-[#25e487]'
                        }>
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#b4b8c0]">
                        {event.email || (event.event_type.startsWith('LOGIN_') ? 'Email not recorded' : 'System / no account')}
                      </td>
                      <td className="px-3 py-3 text-[#b4b8c0]">
                        {event.source_ip || 'IP not recorded'}
                        {(event.source_ip === '127.0.0.1' || event.source_ip === '::1') && <p className="mt-1 text-xs text-[#8c929c]">Loopback address recorded</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && !error && data?.logs.length === 0 && (
              <p className="text-[#8c929c] text-sm text-center py-10">
                No matching security events.
              </p>
            )}

            {loading && (
              <p className="text-[#8c929c] text-sm text-center py-10">
                Loading security logs...
              </p>
            )}
          </div>

          <div className="rw-security-logs-pagination flex items-center justify-between mt-5">
            <span className="text-[#8c929c] text-sm">
              Page {data?.pagination.page ?? page} of {Math.max(1, data?.pagination.total_pages ?? 1)}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-lg border border-[#30343b] text-[#f5f5f5] disabled:opacity-30"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loading || page >= (data?.pagination.total_pages ?? 1)}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-lg border border-[#30343b] text-[#f5f5f5] disabled:opacity-30"
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
