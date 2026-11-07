import { useCallback, useEffect, useMemo, useState } from "react";

type IncidentRecord = {
  id: number;
  status?: string | null;
  severity?: string | null;
  source_ip?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  related_event_count?: number | null;
  [key: string]: unknown;
};

type EventRecord = {
  id: number;
  event_type?: string | null;
  source_ip?: string | null;
  severity?: string | null;
  details?: unknown;
  created_at?: string | null;
  email?: string | null;
};

type NoteRecord = {
  id: number;
  note: string;
  created_at?: string | null;
  analyst_id?: number | null;
};

type DetailResponse = {
  incident: IncidentRecord;
  events: EventRecord[];
  notes: NoteRecord[];
};

const API = "/api/security/incidents";

const panel =
  "rounded-[14px] border border-[#30343b] bg-[#14171c] p-5";
const muted = "text-[#8c929c]";
const control =
  "rounded-lg border border-[#30343b] bg-[#1a1d22] px-3 py-2 text-sm text-[#f5f5f5]";
const action =
  "rounded-lg bg-[#8f202b] px-4 py-2 text-sm font-medium text-white disabled:opacity-40";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
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
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.error === "string") message = body.error;
    } catch {
      // Keep HTTP error.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function dateLabel(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T") + "Z";
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString();
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function incidentTitle(item: IncidentRecord): string {
  for (const field of ["title", "name", "incident_type", "event_type", "description"]) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return `Security incident #${item.id}`;
}

function Badge({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const color = upper === "CRITICAL" || upper === "OPEN"
    ? "bg-[#35161b] text-[#ff737b]"
    : upper === "HIGH" || upper === "INVESTIGATING"
      ? "bg-[#392b16] text-[#f5b942]"
      : upper === "RESOLVED" || upper === "LOW"
        ? "bg-[#163326] text-[#25e487]"
        : "bg-[#292e36] text-[#c5cad2]";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {value || "Unknown"}
    </span>
  );
}

export default function RussellWealthIncidentInvestigation() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refreshList = useCallback(async () => {
    try {
      const data = await request<{ incidents: IncidentRecord[] }>(API);
      const records = Array.isArray(data.incidents) ? data.incidents : [];
      setIncidents(records);
      setSelectedId(current =>
        current !== null && records.some(item => item.id === current)
          ? current
          : records[0]?.id ?? null
      );
      setError("");
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async (id: number) => {
    try {
      const data = await request<DetailResponse>(`${API}/${id}`);
      setDetail(data);
      setDetailError("");
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to load incident details");
    }
  }, []);

  useEffect(() => {
    void refreshList();
    const timer = window.setInterval(() => void refreshList(), 15000);
    return () => window.clearInterval(timer);
  }, [refreshList]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      setDetailError("");
      return;
    }

    setDetail(null);
    void refreshDetail(selectedId);
    const timer = window.setInterval(() => void refreshDetail(selectedId), 15000);
    return () => window.clearInterval(timer);
  }, [selectedId, refreshDetail]);

  const selected = detail?.incident?.id === selectedId
    ? detail.incident
    : incidents.find(item => item.id === selectedId) ?? null;

  const filtered = useMemo(() => incidents.filter(item => {
    if (filter !== "ALL" && (item.status ?? "UNKNOWN").toUpperCase() !== filter) return false;
    const query = search.trim().toLowerCase();
    return !query || [
      item.id,
      incidentTitle(item),
      item.source_ip,
      item.severity,
      item.status
    ].some(value => String(value ?? "").toLowerCase().includes(query));
  }), [incidents, filter, search]);

  const openCount = incidents.filter(i => i.status?.toUpperCase() === "OPEN").length;
  const investigatingCount = incidents.filter(i => i.status?.toUpperCase() === "INVESTIGATING").length;
  const resolvedCount = incidents.filter(i => i.status?.toUpperCase() === "RESOLVED").length;

  async function changeStatus(status: string) {
    if (selectedId === null || busy) return;
    setBusy(true);
    try {
      await request(`${API}/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await Promise.all([refreshList(), refreshDetail(selectedId)]);
      setDetailError("");
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !note.trim() || busy) return;
    setBusy(true);
    try {
      await request(`${API}/${selectedId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() })
      });
      setNote("");
      await refreshDetail(selectedId);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to save note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#080a0d]">
      
      <main className="min-w-0 flex-1 bg-[#080a0d] px-5 py-7 text-[#f5f5f5] md:px-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8c929c]">
            Security Operations / Incident Management
          </p>
          <h1 className="font-serif text-3xl font-bold">Incident Investigation</h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Live incident records from Russell Wealth security monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${muted}`}>
            {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : "Connecting"}
          </span>
          <button className={control} onClick={() => {
            void refreshList();
            if (selectedId !== null) void refreshDetail(selectedId);
          }}>Refresh</button>
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-[#8f202b] bg-[#260f14] p-4 text-sm text-[#ff737b]">
          Live incident API: {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Total incidents", incidents.length],
          ["Open", openCount],
          ["Investigating", investigatingCount],
          ["Resolved", resolvedCount],
        ].map(([label, value]) => (
          <div key={String(label)} className={panel}>
            <p className={`text-xs ${muted}`}>{label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.65fr)]">
        <section className={`${panel} min-w-0`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Incident queue</h2>
            <span className={`text-xs ${muted}`}>{filtered.length} records</span>
          </div>
          <input
            aria-label="Search incidents"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents or IPs"
            className={`${control} mb-3 w-full`}
          />
          <select
            aria-label="Filter incidents by status"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={`${control} mb-4 w-full`}
          >
            {["ALL", "OPEN", "INVESTIGATING", "RESOLVED"].map(value => (
              <option key={value} value={value}>{value === "ALL" ? "All statuses" : value}</option>
            ))}
          </select>
          <div className="max-h-[700px] space-y-2 overflow-y-auto">
            {loading && <p className={muted}>Loading incidents...</p>}
            {!loading && filtered.length === 0 && (
              <p className={`py-8 text-center text-sm ${muted}`}>
                {error ? "Unable to retrieve incident records." : "No matching incidents recorded."}
              </p>
            )}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedId === item.id
                    ? "border-[#8f202b] bg-[#25191d]"
                    : "border-[#30343b] bg-[#1a1d22] hover:border-[#626974]"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#b4b8c0]">INC-{item.id}</span>
                  <Badge value={display(item.severity)} />
                </div>
                <p className="mb-2 break-words text-sm font-semibold">{incidentTitle(item)}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs ${muted}`}>{dateLabel(item.created_at)}</span>
                  <Badge value={display(item.status)} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="min-w-0 space-y-5">
          {!selected && (
            <section className={panel}>
              <p className={muted}>Select an incident to inspect its evidence and response history.</p>
            </section>
          )}

          {selected && (
            <>
              <section className={panel}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`mb-2 text-xs ${muted}`}>INC-{selected.id}</p>
                    <h2 className="break-words font-serif text-2xl font-bold">{incidentTitle(selected)}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge value={display(selected.severity)} />
                    <Badge value={display(selected.status)} />
                  </div>
                </div>
                <div className="mb-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                  {[
                    ["Detected", dateLabel(selected.created_at)],
                    ["Source IP", display(selected.source_ip)],
                    ["Related events", display(selected.related_event_count)],
                    ["Resolved", dateLabel(selected.resolved_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className={`mb-1 text-xs ${muted}`}>{label}</p>
                      <p className="break-words">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["OPEN", "INVESTIGATING", "RESOLVED"].map(status => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || selected.status?.toUpperCase() === status}
                      onClick={() => void changeStatus(status)}
                      className={status === "RESOLVED" ? action : control}
                    >
                      {status === "OPEN" ? "Reopen" : status === "INVESTIGATING" ? "Investigate" : "Resolve"}
                    </button>
                  ))}
                </div>
                {detailError && <p role="alert" className="mt-4 text-sm text-[#ff737b]">{detailError}</p>}
              </section>

              <section className={panel}>
                <h2 className="mb-4 text-lg font-semibold">Incident record</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(selected)
                    .filter(([key]) => !["id", "status", "severity", "source_ip", "created_at", "resolved_at", "related_event_count"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="min-w-0 rounded-lg bg-[#1a1d22] p-3">
                        <p className={`mb-1 break-words text-xs ${muted}`}>{key.replaceAll("_", " ")}</p>
                        <p className="break-words whitespace-pre-wrap text-sm">{display(value)}</p>
                      </div>
                    ))}
                </div>
              </section>

              <section className={panel}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Related security events</h2>
                  <span className={`text-xs ${muted}`}>{detail?.events.length ?? 0} loaded</span>
                </div>
                {!detail && <p className={muted}>Loading related evidence...</p>}
                {detail && detail.events.length === 0 && (
                  <p className={`text-sm ${muted}`}>No related security events found.</p>
                )}
                <div className="max-h-[480px] space-y-3 overflow-y-auto">
                  {detail?.events.map(event => (
                    <article key={event.id} className="rounded-lg border border-[#30343b] bg-[#1a1d22] p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{display(event.event_type)}</p>
                        <Badge value={display(event.severity)} />
                      </div>
                      <p className={`mb-2 text-xs ${muted}`}>
                        {dateLabel(event.created_at)} · {display(event.source_ip)}
                      </p>
                      {event.email && <p className="mb-2 break-words text-xs">{event.email}</p>}
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-[#b4b8c0]">
                        {display(event.details)}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>

              <section className={panel}>
                <h2 className="mb-4 text-lg font-semibold">Analyst notes</h2>
                <div className="mb-5 space-y-3">
                  {!detail && <p className={muted}>Loading notes...</p>}
                  {detail && detail.notes.length === 0 && (
                    <p className={`text-sm ${muted}`}>No analyst notes recorded.</p>
                  )}
                  {detail?.notes.map(item => (
                    <article key={item.id} className="rounded-lg bg-[#1a1d22] p-4">
                      <p className="whitespace-pre-wrap break-words text-sm">{item.note}</p>
                      <p className={`mt-2 text-xs ${muted}`}>
                        {dateLabel(item.created_at)}
                        {item.analyst_id != null ? ` · Analyst #${item.analyst_id}` : ""}
                      </p>
                    </article>
                  ))}
                </div>
                <form onSubmit={e => void addNote(e)}>
                  <label htmlFor="incident-note" className="mb-2 block text-sm font-medium">
                    Add investigation note
                  </label>
                  <textarea
                    id="incident-note"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder="Document findings, evidence, or response actions..."
                    className={`${control} mb-3 w-full resize-y`}
                  />
                  <button className={action} disabled={busy || !note.trim()} type="submit">
                    {busy ? "Saving..." : "Save note"}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
