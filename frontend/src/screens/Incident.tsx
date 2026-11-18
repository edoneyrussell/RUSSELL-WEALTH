import { sharedFetch } from '../experience/sharedFetch';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getLocale } from "../i18n/language";

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

type Investigation = {
  timeline: {key: string; kind: string; title: string; created_at: string; details: string; reason?: string; outcome?: string; actor_name?: string; actor_email?: string; account_email?: string; source_ip?: string; severity?: string}[];
  accounts: {id: number; name: string; email: string; status: string; can_suspend: boolean; can_revoke: boolean; protection_reason?: string}[];
  can_manage_accounts: boolean;
  truncated: boolean;
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
  const response = await sharedFetch(url, {
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
    : parsed.toLocaleString(getLocale());
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
  const [selectedId, setSelectedId] = useState<number | null>(() => { const id=Number(new URLSearchParams(window.location.search).get("incident")); return Number.isInteger(id) && id>0 ? id : null; });
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const activeId = useRef(selectedId);
  activeId.current = selectedId;
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const listPending=useRef(false);
  const detailPending=useRef<number|null>(null);
  const refreshList = useCallback(async () => {
    if(listPending.current)return;listPending.current=true;
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
      setLoading(false);listPending.current=false;
    }
  }, []);

  const refreshDetail = useCallback(async (id: number) => {
    if(detailPending.current===id)return;detailPending.current=id;
    try {
      const [data, evidence] = await Promise.all([
        request<DetailResponse>(`${API}/${id}`),
        request<Investigation>(`${API}/${id}/investigation`),
      ]);
      if (activeId.current !== id) return;
      setDetail(data);
      setInvestigation(evidence);
      setDetailError("");
    } catch (err) {
      if (activeId.current === id) setDetailError(err instanceof Error ? err.message : "Unable to load incident details");
    } finally {if(detailPending.current===id)detailPending.current=null;}
  }, []);

  useEffect(() => {
    void refreshList();
    const visible=()=>{if(document.visibilityState==='visible')void refreshList();};
    const timer=window.setInterval(visible,30000);
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
  }, [refreshList]);

  useEffect(() => {
    setInvestigation(null);
    setNote("");
    setDetailError("");
    if (selectedId === null) {
      setDetail(null);
      setDetailError("");
      return;
    }

    setDetail(null);
    void refreshDetail(selectedId);
    const visible=()=>{if(document.visibilityState==='visible')void refreshDetail(selectedId);};
    const timer=window.setInterval(visible,15000);
    window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
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

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !note.trim() || busy) return;
    const id = selectedId;
    setBusy(true);
    try {
      await request(`${API}/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() })
      });
      if (activeId.current === id) setNote("");
      await refreshDetail(id);
    } catch (err) {
      if (activeId.current === id) setDetailError(err instanceof Error ? err.message : "Unable to save note");
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
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
                {detailError && <p role="alert" className="mt-4 text-sm text-[#ff737b]">{detailError}</p>}
              </section>

              <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-5">
                  <section className={panel}>
                    <h2 className="text-lg font-semibold">Investigation timeline</h2>
                    <p className={`mt-2 mb-5 text-sm ${muted}`}>Related logins, account changes, alerts, notes, and response actions in chronological order.</p>
                    {!investigation && <p className={muted}>Loading related evidence...</p>}
                    {investigation?.truncated && <p role="status" className="mb-4 text-sm text-[#f5b942]">This timeline shows the most recent evidence. Older records remain in security logs.</p>}
                    <ol className="max-h-[650px] space-y-4 overflow-y-auto pr-1">
                      {investigation?.timeline.map(item => (
                        <li key={item.key} className="ml-2 border-l-2 border-[#30343b] pl-5">
                          <article className="rounded-lg bg-[#1a1d22] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`text-xs ${muted}`}>{item.kind}</span>
                              <time className={`text-xs ${muted}`} dateTime={item.created_at}>{dateLabel(item.created_at)}</time>
                            </div>
                            <h3 className="mt-2 break-words text-sm font-semibold">{item.title}</h3>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#b4b8c0]">{display(item.details)}</p>
                            {item.reason && <p className="mt-3 whitespace-pre-wrap break-words text-sm"><span className={muted}>Reason: </span>{item.reason}</p>}
                            {item.actor_name && <p className={`mt-2 break-words text-xs ${muted}`}>{item.actor_name}{item.actor_email ? ` · ${item.actor_email}` : ""}</p>}
                            {item.account_email && <p className={`mt-2 break-words text-xs ${muted}`}>{item.account_email}</p>}
                            {item.source_ip && <p className={`mt-2 text-xs ${muted}`}>{item.source_ip}</p>}
                            {item.outcome && <span className={`mt-3 inline-block rounded px-2 py-1 text-xs ${item.outcome === "SUCCEEDED" ? "bg-[#163326] text-[#25e487]" : "bg-[#35161b] text-[#ff737b]"}`}>{item.outcome}</span>}
                            {item.severity && <div className="mt-3"><Badge value={item.severity}/></div>}
                          </article>
                        </li>
                      ))}
                    </ol>
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
                </div>
                <ResponsePanel key={selected.id} incidentId={selected.id} status={selected.status ?? "OPEN"}
                  evidence={investigation} onComplete={async () => { await Promise.all([refreshList(), refreshDetail(selected.id)]); }}/>
              </div>
            </>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}

function ResponsePanel({ incidentId, status, evidence, onComplete }: {
  incidentId: number; status: string; evidence: Investigation | null; onComplete: () => Promise<void>;
}) {
  const [responseAction, setResponseAction] = useState("UPDATE_STATUS");
  const [nextStatus, setNextStatus] = useState(status);
  const [accountId, setAccountId] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setNextStatus(status); }, [status]);
  const containment = responseAction !== "UPDATE_STATUS";
  const accounts = evidence?.accounts ?? [];
  const target = accounts.find(account => String(account.id) === accountId);
  const allowed = !containment || (evidence?.can_manage_accounts && target && (responseAction === "SUSPEND_ACCOUNT" ? target.can_suspend : target.can_revoke));
  function edit() { requestId.current = crypto.randomUUID(); setMessage(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !allowed || !evidence) return;
    setPending(true); setMessage("");
    try {
      await request(`${API}/${incidentId}/response`, { method: "POST", body: JSON.stringify({
        action: responseAction, reason: reason.trim(), request_id: requestId.current,
        ...(containment ? {account_id: Number(accountId), current_password: password} : {status: nextStatus}),
      }) });
      if (mounted.current) { setPassword(""); setReason(""); setFailed(false); setMessage("Response recorded successfully."); requestId.current = crypto.randomUUID(); }
      await onComplete();
    } catch (err) {
      if (mounted.current) { setFailed(true); setMessage(err instanceof Error ? err.message : "Response failed."); }
      await onComplete();
    } finally { if (mounted.current) setPending(false); }
  }
  return <aside className={`${panel} h-fit min-w-0 2xl:sticky 2xl:top-5`}>
    <h2 className="text-lg font-semibold">Response panel</h2>
    <p className={`mt-2 text-sm ${muted}`}>Every response records the analyst, time, reason, and outcome.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={pending || !evidence} className="min-w-0 space-y-4 disabled:opacity-60">
        <label className="block text-sm">Response action
          <select className={`${control} mt-2 w-full`} value={responseAction} onChange={e => {setResponseAction(e.target.value); setPassword(""); edit();}}>
            <option value="UPDATE_STATUS">Update incident status</option>
            <option value="SUSPEND_ACCOUNT" disabled={!evidence?.can_manage_accounts}>Suspend account</option>
            <option value="REVOKE_SESSIONS" disabled={!evidence?.can_manage_accounts}>Revoke sessions</option>
          </select>
        </label>
        {!containment ? <label className="block text-sm">Incident status
          <select className={`${control} mt-2 w-full`} value={nextStatus} onChange={e => {setNextStatus(e.target.value); edit();}}>
            <option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option>
          </select>
        </label> : <>
          <label className="block text-sm">Related account
            <select required className={`${control} mt-2 w-full`} value={accountId} onChange={e => {setAccountId(e.target.value); edit();}}>
              <option value="">Choose an account</option>
              {accounts.map(account => <option key={account.id} value={account.id} disabled={responseAction === "SUSPEND_ACCOUNT" ? !account.can_suspend : !account.can_revoke}>{account.email} · {account.status}</option>)}
            </select>
          </label>
          {accounts.length === 0 && <p className={`text-sm ${muted}`}>No related accounts found in the incident evidence.</p>}
          {target?.protection_reason && <p className="text-sm text-[#f5b942]">{target.protection_reason}</p>}
          <p className="rounded-lg border border-[#673238] bg-[#25191d] p-3 text-sm text-[#f3bcc1]">{responseAction === "SUSPEND_ACCOUNT" ? "Suspending this account blocks sign-in and immediately revokes its existing sessions." : "Revoking sessions signs this account out on all devices. The account can sign in again."}</p>
          <label className="block text-sm">Your administrator password
            <input required type="password" autoComplete="current-password" maxLength={1024} className={`${control} mt-2 w-full`} value={password} onChange={e => {setPassword(e.target.value); edit();}}/>
          </label>
        </>}
        <label className="block text-sm">Reason for response
          <textarea required minLength={10} maxLength={1000} rows={4} className={`${control} mt-2 w-full resize-y`} value={reason} onChange={e => {setReason(e.target.value); edit();}} placeholder="Explain the evidence and why this response is needed."/>
        </label>
        <p className={`text-xs ${muted}`}>10–1000 characters. Do not include passwords or secrets.</p>
        <button className={`${action} w-full`} disabled={!allowed || reason.trim().length < 10 || (containment && !password) || (!containment && nextStatus === status)} type="submit">{pending ? "Saving..." : responseAction === "UPDATE_STATUS" ? "Update incident status" : responseAction === "SUSPEND_ACCOUNT" ? "Confirm account suspension" : "Confirm session revocation"}</button>
      </fieldset>
      {evidence && !evidence.can_manage_accounts && <p className={`text-xs ${muted}`}>Only the designated administrator can suspend accounts or revoke sessions.</p>}
      {message && <p role={failed ? "alert" : "status"} className={`break-words text-sm ${failed ? "text-[#ff737b]" : "text-[#25e487]"}`}>{message}</p>}
    </form>
  </aside>;
}
