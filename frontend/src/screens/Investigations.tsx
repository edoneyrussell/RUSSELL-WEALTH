import { useCallback, useEffect, useMemo, useState } from "react";

type Case = {
  id: number;
  severity?: string | null;
  status?: string | null;
  source_ip?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  related_event_count?: number | null;
  [key: string]: unknown;
};

type SecurityEvent = {
  id: number;
  user_id?: number | null;
  email?: string | null;
  event_type?: string | null;
  severity?: string | null;
  source_ip?: string | null;
  details?: unknown;
  created_at?: string | null;
};

type Note = {
  id: number;
  note: string;
  analyst_id?: number | null;
  created_at?: string | null;
};

type Detail = {
  incident: Case;
  events: SecurityEvent[];
  notes: Note[];
};

const API = "/api/security/incidents";
const card = "rounded-xl border border-[#30343b] bg-[#14171c] p-5";
const input = "w-full rounded-lg border border-[#30343b] bg-[#1a1d22] px-3 py-2 text-sm text-white outline-none focus:border-[#a94450]";
const button = "rounded-lg border border-[#444a53] bg-[#23272e] px-3 py-2 text-xs font-semibold hover:bg-[#343943] disabled:opacity-40";
const muted = "text-[#8c929c]";

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let error = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.error === "string") error = body.error;
    } catch {
      // Preserve HTTP error.
    }
    throw new Error(error);
  }

  return response.json() as Promise<T>;
}

function label(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function date(value: unknown): string {
  if (typeof value !== "string" || !value) return "Not recorded";
  const parsed = new Date(
    value.includes("T") ? value : value.replace(" ", "T") + "Z"
  );
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function title(record: Case): string {
  for (const key of ["title", "name", "incident_type", "event_type", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return `Security incident #${record.id}`;
}

function Tag({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const style = ["CRITICAL", "OPEN"].includes(upper)
    ? "bg-[#36171c] text-[#ff737b]"
    : ["HIGH", "INVESTIGATING"].includes(upper)
      ? "bg-[#3a2b17] text-[#f5b942]"
      : ["RESOLVED", "LOW"].includes(upper)
        ? "bg-[#173427] text-[#25e487]"
        : "bg-[#2a3038] text-[#d0d4da]";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>
      {value}
    </span>
  );
}

function Metric({
  heading,
  value,
  detail,
}: {
  heading: string;
  value: number;
  detail: string;
}) {
  return (
    <div className={card}>
      <p className={`text-xs ${muted}`}>{heading}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-2 text-xs ${muted}`}>{detail}</p>
    </div>
  );
}

export default function Investigations() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [tab, setTab] = useState<"evidence" | "indicators" | "notes" | "record">("evidence");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCases = useCallback(async () => {
    try {
      const data = await api<{ incidents: Case[] }>(API);
      const items = Array.isArray(data.incidents) ? data.incidents : [];

      setCases(items);
      setSelectedId(previous =>
        previous !== null && items.some(item => item.id === previous)
          ? previous
          : items[0]?.id ?? null
      );
      setUpdated(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load investigations");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const data = await api<Detail>(`${API}/${id}`);
      setDetail(data);
      setDetailError("");
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load evidence");
    }
  }, []);

  useEffect(() => {
    void loadCases();
    const timer = window.setInterval(() => void loadCases(), 15000);
    return () => window.clearInterval(timer);
  }, [loadCases]);

  useEffect(() => {
    setDetail(null);
    setDetailError("");

    if (selectedId === null) return;

    void loadDetail(selectedId);
    const timer = window.setInterval(() => void loadDetail(selectedId), 15000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => cases.filter(item => {
    if (status !== "ALL" && item.status?.toUpperCase() !== status) return false;
    if (severity !== "ALL" && item.severity?.toUpperCase() !== severity) return false;

    const query = search.trim().toLowerCase();
    return !query || [
      item.id, title(item), item.source_ip, item.status, item.severity
    ].some(value => String(value ?? "").toLowerCase().includes(query));
  }), [cases, status, severity, search]);

  const active = cases.filter(item => item.status?.toUpperCase() !== "RESOLVED");

  const current = detail?.incident.id === selectedId
    ? detail.incident
    : cases.find(item => item.id === selectedId) ?? null;

  const events = detail?.incident.id === selectedId ? detail.events : [];
  const notes = detail?.incident.id === selectedId ? detail.notes : [];

  const addresses = useMemo(
    () => [...new Set(events.map(e => e.source_ip).filter((ip): ip is string => Boolean(ip)))],
    [events]
  );

  const accounts = useMemo(
    () => [...new Set(events.map(e =>
      e.email || (e.user_id != null ? `User #${e.user_id}` : "")
    ).filter(Boolean))],
    [events]
  );

  const eventTypes = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of events) {
      const name = event.event_type || "Unspecified";
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  async function updateStatus(next: string) {
    if (selectedId === null || busy) return;

    setBusy(true);
    try {
      await api(`${API}/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await Promise.all([loadCases(), loadDetail(selectedId)]);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !note.trim() || busy) return;

    setBusy(true);
    try {
      await api(`${API}/${selectedId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      });
      setNote("");
      await loadDetail(selectedId);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to save note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#080a0d] text-[#f5f5f5]">
      

      <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`mb-2 text-xs uppercase tracking-[0.17em] ${muted}`}>
              SOC Operations / Investigations
            </p>
            <h1 className="font-serif text-3xl font-bold">
              Investigation Workspace
            </h1>
            <p className={`mt-2 text-sm ${muted}`}>
              Case triage, correlated security evidence, and analyst response
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs ${muted}`}>
              {updated
                ? `Last checked ${updated.toLocaleTimeString()}`
                : "Connecting to security API"}
            </span>
            <button
              className={button}
              onClick={() => {
                void loadCases();
                if (selectedId !== null) void loadDetail(selectedId);
              }}
            >
              Refresh data
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-[#8f202b] bg-[#260f14] p-4 text-sm text-[#ff737b]">
            Live security API: {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric heading="Total cases" value={cases.length} detail="Recorded incidents" />
          <Metric heading="Active cases" value={active.length} detail="Not marked resolved" />
          <Metric heading="Critical cases" value={cases.filter(i => i.severity?.toUpperCase() === "CRITICAL").length} detail="Across all statuses" />
          <Metric heading="Investigating" value={cases.filter(i => i.status?.toUpperCase() === "INVESTIGATING").length} detail="Currently in investigation" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
          <section className={`${card} min-w-0`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Case queue</h2>
              <span className={`text-xs ${muted}`}>{filtered.length} cases</span>
            </div>

            <input
              className={`${input} mb-3`}
              placeholder="Search case, IP, severity..."
              aria-label="Search investigations"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="mb-4 grid grid-cols-2 gap-2">
              <select className={input} value={status} onChange={e => setStatus(e.target.value)}>
                {["ALL", "OPEN", "INVESTIGATING", "RESOLVED"].map(v => (
                  <option key={v} value={v}>{v === "ALL" ? "All statuses" : v}</option>
                ))}
              </select>
              <select className={input} value={severity} onChange={e => setSeverity(e.target.value)}>
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(v => (
                  <option key={v} value={v}>{v === "ALL" ? "All severities" : v}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[780px] space-y-2 overflow-y-auto">
              {loading && <p className={`text-sm ${muted}`}>Loading cases...</p>}

              {!loading && filtered.length === 0 && (
                <p className={`py-8 text-center text-sm ${muted}`}>
                  {error ? "Unable to retrieve cases." : "No matching cases recorded."}
                </p>
              )}

              {filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setTab("evidence");
                  }}
                  className={`w-full rounded-lg border p-4 text-left ${
                    selectedId === item.id
                      ? "border-[#8f202b] bg-[#29191e]"
                      : "border-[#30343b] bg-[#1a1d22] hover:border-[#747a83]"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold">INC-{item.id}</span>
                    <Tag value={label(item.severity)} />
                  </div>
                  <p className="mb-2 break-words text-sm font-semibold">{title(item)}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs ${muted}`}>{date(item.created_at)}</span>
                    <Tag value={label(item.status)} />
                  </div>
                  <p className={`mt-2 text-xs ${muted}`}>
                    Source: {label(item.source_ip)} · Related events: {item.related_event_count ?? "—"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <div className="min-w-0 space-y-5">
            {!current && (
              <section className={card}>
                <p className={`text-sm ${muted}`}>
                  Select a recorded case to review its evidence and investigation history.
                </p>
              </section>
            )}

            {current && (
              <>
                <section className={card}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`mb-2 text-xs ${muted}`}>
                        INVESTIGATION / INC-{current.id}
                      </p>
                      <h2 className="font-serif text-2xl font-bold">{title(current)}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Tag value={label(current.severity)} />
                      <Tag value={label(current.status)} />
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    {[
                      ["Detected", date(current.created_at)],
                      ["Source IP", label(current.source_ip)],
                      ["Related events", label(current.related_event_count)],
                      ["Resolved", date(current.resolved_at)],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <p className={`mb-1 text-xs ${muted}`}>{key}</p>
                        <p className="break-words">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["OPEN", "INVESTIGATING", "RESOLVED"] as const).map(next => (
                      <button
                        key={next}
                        className={button}
                        disabled={busy || current.status?.toUpperCase() === next}
                        onClick={() => void updateStatus(next)}
                      >
                        {next === "OPEN"
                          ? "Reopen"
                          : next === "INVESTIGATING"
                            ? "Start investigation"
                            : "Resolve case"}
                      </button>
                    ))}
                  </div>

                  {detailError && (
                    <p role="alert" className="mt-3 text-sm text-[#ff737b]">
                      {detailError}
                    </p>
                  )}
                </section>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Metric heading="Evidence events" value={events.length} detail="Correlated records returned" />
                  <Metric heading="Observed IPs" value={addresses.length} detail="Unique event sources" />
                  <Metric heading="Observed accounts" value={accounts.length} detail="Unique recorded identities" />
                </div>

                <section className={card}>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {([
                      ["evidence", "Event timeline"],
                      ["indicators", "Indicators & analysis"],
                      ["notes", "Analyst notes"],
                      ["record", "Case metadata"],
                    ] as const).map(([key, name]) => (
                      <button
                        key={key}
                        className={`${button} ${tab === key ? "border-[#a94450] bg-[#44232a]" : ""}`}
                        onClick={() => setTab(key)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {detail?.incident.id !== selectedId && (
                    <p className={`text-sm ${muted}`}>Loading case evidence...</p>
                  )}

                  {detail?.incident.id === selectedId && tab === "evidence" && (
                    <>
                      <div className="mb-4 flex justify-between gap-3">
                        <h3 className="text-lg font-semibold">Correlated security events</h3>
                        <span className={`text-xs ${muted}`}>{events.length} returned</span>
                      </div>

                      <p className={`mb-4 text-xs ${muted}`}>
                        Events are correlated by source IP and detection time.
                        Correlation alone does not establish causation.
                      </p>

                      <div className="max-h-[540px] space-y-3 overflow-y-auto">
                        {events.length === 0 && (
                          <p className={`text-sm ${muted}`}>No correlated events found.</p>
                        )}

                        {events.map(event => (
                          <article
                            key={event.id}
                            className="rounded-lg border border-[#30343b] bg-[#1a1d22] p-4"
                          >
                            <div className="mb-2 flex flex-wrap justify-between gap-2">
                              <p className="text-sm font-semibold">{label(event.event_type)}</p>
                              <Tag value={label(event.severity)} />
                            </div>
                            <p className={`mb-2 text-xs ${muted}`}>
                              {date(event.created_at)} · {label(event.source_ip)}
                            </p>
                            <p className="mb-2 break-words text-xs">
                              {event.email || (event.user_id != null
                                ? `User #${event.user_id}`
                                : "No account recorded")}
                            </p>
                            <pre className="whitespace-pre-wrap break-words text-xs text-[#b4b8c0]">
                              {label(event.details)}
                            </pre>
                          </article>
                        ))}
                      </div>
                    </>
                  )}

                  {detail?.incident.id === selectedId && tab === "indicators" && (
                    <>
                      <h3 className="mb-4 text-lg font-semibold">Observed indicators</h3>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-[#1a1d22] p-4">
                          <h4 className="mb-3 text-sm font-semibold">Source IP addresses</h4>
                          {addresses.length
                            ? addresses.map(ip => (
                                <p key={ip} className="mb-2 break-all font-mono text-xs">{ip}</p>
                              ))
                            : <p className={`text-xs ${muted}`}>No event IPs recorded</p>}
                        </div>

                        <div className="rounded-lg bg-[#1a1d22] p-4">
                          <h4 className="mb-3 text-sm font-semibold">Observed identities</h4>
                          {accounts.length
                            ? accounts.map(account => (
                                <p key={account} className="mb-2 break-all text-xs">{account}</p>
                              ))
                            : <p className={`text-xs ${muted}`}>No identities recorded</p>}
                        </div>
                      </div>

                      <h4 className="mb-3 mt-6 text-sm font-semibold">
                        Event-type distribution
                      </h4>

                      {eventTypes.length
                        ? eventTypes.map(([name, count]) => (
                            <div key={name} className="mb-3">
                              <div className="mb-1 flex justify-between gap-2 text-xs">
                                <span className="break-words">{name}</span>
                                <span>{count}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#292e36]">
                                <div
                                  className="h-full rounded-full bg-[#9c3540]"
                                  style={{
                                    width: `${count / Math.max(events.length, 1) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        : <p className={`text-xs ${muted}`}>No event types available</p>}
                    </>
                  )}

                  {detail?.incident.id === selectedId && tab === "notes" && (
                    <>
                      <h3 className="mb-4 text-lg font-semibold">Investigation journal</h3>

                      <div className="mb-5 max-h-[340px] space-y-3 overflow-y-auto">
                        {notes.length === 0 && (
                          <p className={`text-sm ${muted}`}>No analyst notes recorded.</p>
                        )}

                        {notes.map(item => (
                          <article key={item.id} className="rounded-lg bg-[#1a1d22] p-4">
                            <p className="whitespace-pre-wrap break-words text-sm">{item.note}</p>
                            <p className={`mt-2 text-xs ${muted}`}>
                              {date(item.created_at)}
                              {item.analyst_id != null ? ` · Analyst #${item.analyst_id}` : ""}
                            </p>
                          </article>
                        ))}
                      </div>

                      <form onSubmit={e => void saveNote(e)}>
                        <label
                          htmlFor="investigation-note"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Add analyst finding
                        </label>
                        <textarea
                          id="investigation-note"
                          rows={4}
                          maxLength={5000}
                          className={`${input} mb-3 resize-y`}
                          placeholder="Document observed evidence, findings, or next steps..."
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                        <button
                          className={button}
                          type="submit"
                          disabled={busy || !note.trim()}
                        >
                          {busy ? "Saving..." : "Save investigation note"}
                        </button>
                      </form>
                    </>
                  )}

                  {detail?.incident.id === selectedId && tab === "record" && (
                    <>
                      <h3 className="mb-4 text-lg font-semibold">Backend case fields</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Object.entries(current).map(([key, value]) => (
                          <div key={key} className="min-w-0 rounded-lg bg-[#1a1d22] p-3">
                            <p className={`mb-1 break-words text-xs ${muted}`}>
                              {key.replace(/_/g, " ")}
                            </p>
                            <pre className="whitespace-pre-wrap break-words text-xs">
                              {label(value)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
