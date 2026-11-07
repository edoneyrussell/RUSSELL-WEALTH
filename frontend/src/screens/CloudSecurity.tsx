import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cloud,
  Database,
  Filter,
  LockKeyhole,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

type Item = Record<string, unknown>;

type Finding = {
  id: string;
  title: string;
  severity: string;
  source: string;
  time: string;
  status: string;
  details: string;
  kind: string;
};

const panel =
  "rounded-xl border border-white/[0.07] bg-[#101820]";

const severityClass: Record<string, string> = {
  CRITICAL: "text-red-300 bg-red-500/10 border-red-500/20",
  HIGH: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  MEDIUM: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  LOW: "text-sky-300 bg-sky-500/10 border-sky-500/20",
};

function asText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function asArray(value: unknown): Item[] {
  return Array.isArray(value)
    ? value.filter((x): x is Item => Boolean(x) && typeof x === "object")
    : [];
}

function extractArray(payload: unknown, keys: string[]): Item[] {
  if (Array.isArray(payload)) return asArray(payload);
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Item;

  for (const key of keys) {
    if (Array.isArray(obj[key])) return asArray(obj[key]);
  }

  if (obj.data && typeof obj.data === "object") {
    return extractArray(obj.data, keys);
  }

  return [];
}

function normalizedSeverity(value: unknown): string {
  const s = asText(value, "LOW").toUpperCase();
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(s)) return s;
  if (s === "ERROR" || s === "SEVERE") return "HIGH";
  if (s === "WARNING" || s === "WARN") return "MEDIUM";
  return "LOW";
}

function eventTitle(item: Item): string {
  return asText(
    item.title ??
    item.event_type ??
    item.alert_type ??
    item.type ??
    item.description ??
    item.name,
    "Security activity"
  );
}

function eventDetails(item: Item): string {
  const raw = item.details ?? item.description ?? item.message ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") return JSON.stringify(raw);
  return "";
}

function isCloudRelevant(item: Item): boolean {
  const text = [
    item.event_type,
    item.title,
    item.description,
    item.details,
    item.source,
    item.resource,
    item.service,
  ].map((x) => asText(x, "")).join(" ").toLowerCase();

  return [
    "cloud", "storage", "bucket", "database", "db_",
    "api", "token", "credential", "access", "login",
    "auth", "permission", "admin", "firewall",
    "network", "server", "infrastructure", "ip",
    "suspicious", "unauthorized", "privilege",
  ].some((word) => text.includes(word));
}

function makeFinding(item: Item, kind: string, index: number): Finding {
  return {
    id: asText(item.id ?? item.event_id ?? item.alert_id, `${kind}-${index}`),
    title: eventTitle(item),
    severity: normalizedSeverity(item.severity ?? item.priority ?? item.level),
    source: asText(
      item.source_ip ?? item.source ?? item.ip_address ?? item.service,
      "Application telemetry"
    ),
    time: asText(
      item.created_at ?? item.timestamp ?? item.detected_at ?? item.time,
      ""
    ),
    status: asText(item.status, kind === "Incident" ? "OPEN" : "OBSERVED"),
    details: eventDetails(item),
    kind,
  };
}

async function loadEndpoint(
  url: string,
  signal: AbortSignal
): Promise<unknown> {
  const response = await fetch(url, {
    credentials: "include",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  return response.json();
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = "text-white",
}: {
  label: string;
  value: number | string;
  icon: typeof Shield;
  accent?: string;
}) {
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{label}</span>
        <Icon size={17} className="text-slate-500" />
      </div>
      <div className={`mt-4 text-3xl font-semibold tracking-tight ${accent}`}>
        {value}
      </div>
    </div>
  );
}

export default function CloudSecurity() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [selected, setSelected] = useState<Finding | null>(null);

  const refresh = useCallback(async (initial = false) => {
    if (!initial) setRefreshing(true);

    const controller = new AbortController();

    try {
      const urls = [
        "/api/security/logs",
        "/api/security/alerts",
        "/api/security/incidents",
      ];

      const results = await Promise.allSettled(
        urls.map((url) => loadEndpoint(url, controller.signal))
      );

      const successes = results.filter(
        (r): r is PromiseFulfilledResult<unknown> =>
          r.status === "fulfilled"
      );

      if (!successes.length) {
        throw new Error("Security telemetry endpoints are unavailable.");
      }

      const logs =
        results[0].status === "fulfilled"
          ? extractArray(results[0].value, ["logs", "events", "records"])
          : [];

      const alerts =
        results[1].status === "fulfilled"
          ? extractArray(results[1].value, ["alerts", "items", "records"])
          : [];

      const incidents =
        results[2].status === "fulfilled"
          ? extractArray(results[2].value, ["incidents", "items"])
          : [];

      const observed = [
        ...incidents.map((x, i) => makeFinding(x, "Incident", i)),
        ...alerts.filter(isCloudRelevant)
          .map((x, i) => makeFinding(x, "Alert", i)),
        ...logs.filter(isCloudRelevant)
          .map((x, i) => makeFinding(x, "Event", i)),
      ];

      setFindings(observed);
      setUpdated(new Date());

      const failures = results.length - successes.length;
      setError(
        failures
          ? `${failures} telemetry source(s) unavailable. Showing partial live data.`
          : ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    void refresh(true);

    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return findings.filter((f) => {
      if (severity !== "ALL" && f.severity !== severity) return false;
      if (!q) return true;

      return [
        f.id, f.title, f.source, f.details, f.kind, f.status,
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [findings, search, severity]);

  const critical = findings.filter((f) => f.severity === "CRITICAL").length;
  const high = findings.filter((f) => f.severity === "HIGH").length;
  const openIncidents = findings.filter(
    (f) => f.kind === "Incident" &&
      !["RESOLVED", "CLOSED"].includes(f.status.toUpperCase())
  ).length;

  return (
    <div className="flex min-h-screen bg-[#080e14] text-slate-100">

      <main className="min-w-0 flex-1 px-6 py-7 lg:px-9">
        <div className="mx-0 max-w-none space-y-6">

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-sky-400">
                <Shield size={14} />
                SECURITY OPERATIONS / CLOUD SECURITY
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Cloud Security
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Cloud-relevant security activity and infrastructure risk visibility
              </p>
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm hover:bg-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          <div className={`${panel} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  error ? "bg-amber-400" : "bg-emerald-400"
                }`} />
              </span>
              <div>
                <div className="text-sm font-medium">
                  Application security telemetry
                </div>
                <div className="text-xs text-slate-400">
                  Existing Russell Wealth security APIs
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {updated
                ? `Last refreshed ${updated.toLocaleTimeString()} · Every 15 seconds`
                : loading ? "Connecting..." : "Not connected"}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Observed Findings"
              value={findings.length}
              icon={Activity}
            />
            <Metric
              label="Critical Findings"
              value={critical}
              icon={ShieldAlert}
              accent="text-red-300"
            />
            <Metric
              label="High Severity"
              value={high}
              icon={AlertTriangle}
              accent="text-orange-300"
            />
            <Metric
              label="Open Incidents"
              value={openIncidents}
              icon={LockKeyhole}
              accent="text-sky-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className={`${panel} p-5 xl:col-span-2`}>
              <div className="mb-5 flex items-center gap-2">
                <Server size={17} className="text-sky-400" />
                <h2 className="font-semibold">Security Monitoring Coverage</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Activity,
                    title: "Application Events",
                    description: "Live backend security logs",
                    connected: true,
                  },
                  {
                    icon: ShieldAlert,
                    title: "Threat Alerts",
                    description: "Live alert detection feed",
                    connected: true,
                  },
                  {
                    icon: Database,
                    title: "Cloud Configuration",
                    description: "AWS / Azure provider integration required",
                    connected: false,
                  },
                  {
                    icon: Cloud,
                    title: "Cloud Asset Inventory",
                    description: "Provider inventory not connected",
                    connected: false,
                  },
                ].map((source) => {
                  const Icon = source.icon;

                  return (
                    <div
                      key={source.title}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Icon size={18} className="text-slate-400" />
                        <span className={`text-[10px] ${
                          source.connected
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}>
                          {source.connected ? "API SOURCE" : "NOT CONNECTED"}
                        </span>
                      </div>
                      <div className="mt-3 text-sm font-medium">
                        {source.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {source.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`${panel} p-5`}>
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck size={17} className="text-sky-400" />
                <h2 className="font-semibold">Security Posture</h2>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="text-xs text-slate-400">
                  Cloud posture score
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-300">
                  Not available
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  A verified cloud security score requires cloud provider
                  configuration and asset inventory access.
                </p>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">AWS integration</span>
                  <span className="text-amber-400">Not connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Azure integration</span>
                  <span className="text-amber-400">Not connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Configuration scans</span>
                  <span className="text-slate-500">Unavailable</span>
                </div>
              </div>
            </section>
          </div>

          <section className={`${panel} overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] p-5">
              <div>
                <h2 className="font-semibold">Security Findings</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Live application events, alerts and incidents relevant to cloud security
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1219] px-3">
                  <Search size={14} className="text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search findings"
                    className="w-44 bg-transparent py-2 text-xs outline-none placeholder:text-slate-600"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1219] px-3">
                  <Filter size={14} className="text-slate-500" />
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="bg-transparent py-2 text-xs outline-none"
                  >
                    <option value="ALL">All severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-white/[0.025] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Finding</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.slice(0, 100).map((f, i) => (
                    <tr
                      key={`${f.kind}-${f.id}-${i}`}
                      onClick={() => setSelected(f)}
                      className="cursor-pointer border-b border-white/[0.045] hover:bg-white/[0.035]"
                    >
                      <td className="max-w-[300px] truncate px-5 py-4 font-medium">
                        {f.title}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{f.kind}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded border px-2 py-1 text-[10px] ${
                          severityClass[f.severity] ?? severityClass.LOW
                        }`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{f.source}</td>
                      <td className="px-5 py-4 text-slate-400">{f.status}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {f.time ? new Date(f.time).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filtered.length && (
                <div className="px-5 py-14 text-center text-sm text-slate-500">
                  {loading
                    ? "Loading live security telemetry..."
                    : findings.length
                      ? "No findings match your filters."
                      : "No cloud-relevant security activity found in available telemetry."}
                </div>
              )}
            </div>
          </section>

          {selected && (
            <section className={`${panel} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-sky-400">
                    {selected.kind} / {selected.id}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">
                    {selected.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.06]"
                >
                  Close details
                </button>
              </div>

              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <div className="text-slate-500">Severity</div>
                  <div className="mt-1">{selected.severity}</div>
                </div>
                <div>
                  <div className="text-slate-500">Source</div>
                  <div className="mt-1">{selected.source}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="mt-1">{selected.status}</div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4 text-xs leading-6 text-slate-300 break-words">
                {selected.details || "No additional event details available."}
              </div>
            </section>
          )}

          <p className="pb-4 text-xs text-slate-600">
            This view uses observed application security telemetry. It does not
            claim to perform AWS/Azure cloud configuration or compliance scans.
          </p>
        </div>
      </main>
    </div>
  );
}
