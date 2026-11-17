import { getLocale } from '../i18n/language';
import { useEffect, useState } from "react";

type Deployment = {provider?: string; commit?: string; branch?: string; environment?: string; built_at?: string; uncommitted_changes?: boolean | null};

type Service = {
  name: string;
  status: "online" | "offline" | "degraded" | "unconfigured";
  latency_ms: number | null;
  http_status: number | null;
  detail: string;
  deployment?: Deployment | null;
  endpoint?: string | null;
};

type InfrastructureResponse = {
  success: boolean;
  checked_at: string;
  current_application?: Deployment;
  services: Service[];
  history_available?: boolean;
  history?: Record<string, {blocks:{start:string;status:string;checks:number}[]; sample_count:number; availability_pct:number|null; first_check_at:string|null}>;
};

const serviceDetails: Record<string, { description: string; url: string }> = {
  Render: {
    description: "Production backend · Flask API",
    url: "https://russell-wealth-api.onrender.com",
  },
  Neon: {
    description: "Production database · PostgreSQL",
    url: "https://console.neon.tech",
  },
  Vercel: {
    description: "Production frontend · React / Vite",
    url: "https://russell-wealth.vercel.app",
  },
};

export default function NetworkInfrastructure() {
  const [selectedService, setSelectedService] = useState(() => new URLSearchParams(window.location.search).get("service"));
  const [data, setData] = useState<InfrastructureResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/security/infrastructure", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Monitoring request failed (HTTP ${response.status})`);
        }

        const result: InfrastructureResponse = await response.json();

        if (!result.success || !Array.isArray(result.services)) {
          throw new Error("Invalid monitoring response");
        }

        if (mounted) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (mounted && !(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Monitoring unavailable");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  const services = data?.services ?? [];
  const color = (status?: string) => status==='online' ? '#5ee2a0' : status==='offline' ? '#ff737d' : status==='degraded' ? '#f6c86b' : '#525965';
  const date = (value?:string|null) => value ? new Date(value).toLocaleString(getLocale()) : 'Not available';
  const online = services.filter(service => service.status === "online").length;

  return (
    <main className="min-h-screen bg-[#080a0d] px-8 py-9 text-[#f5f5f5]">
      <div className="mx-0 max-w-none space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#8c929c]">
              RUSSELL WEALTH / SECURITY OPERATIONS
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Network Infrastructure
            </h1>
            <p className="mt-2 text-sm text-[#8c929c]">
              Live connectivity and response monitoring across production services.
            </p>
          </div>
          <div className="rounded-full border border-[#30343b] bg-[#14171c] px-4 py-2 text-xs text-[#b4b8c0]">
            Auto-refresh · 15 seconds
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-[#79333a] bg-[#24171b] p-4 text-sm text-[#ff929a]">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-[#30343b] bg-[#14171c] p-5 md:p-6">
          <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Live connection diagram</h2><p className="mt-1 text-xs text-[#8c929c]">Your application’s path from visitor to database</p></div><span className="text-xs text-[#8c929c]">Endpoint checks · 15 seconds</span></div>
          <div className="mt-6 grid items-center gap-2 md:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr]">
            {['Visitor','Vercel','Render','Neon'].map((name,index) => {
              const service=services.find(item=>item.name===name);
              return <div key={name} className="contents">
                {index>0 && <div aria-hidden="true" className="text-center text-xl" style={{color:color(service?.status)}}><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></div>}
                <button type="button" onClick={()=>{if(index>0)setSelectedService(name);}} className={`min-w-0 rounded-xl border bg-[#0e1116] p-5 text-left transition-colors ${selectedService===name ? 'border-[#8eafd9]' : 'border-[#30343b]'}`}>
                  <div className="mb-3 flex items-center justify-between gap-2"><span className="text-lg font-semibold">{name}</span><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background:color(service?.status)}}/></div>
                  <p className="text-xs text-[#8c929c]">{index===0 ? 'Browser' : index===1 ? 'Frontend · HTTPS' : index===2 ? 'Backend · API' : 'Database · SQL'}</p>
                  <p className="mt-3 text-xs" style={{color:color(service?.status)}}>{index===0 ? 'Entry point' : service?.status || 'Checking'}</p>
                </button>
              </div>;
            })}
          </div>
          <p className="mt-4 text-xs text-[#8c929c]">Connections show the application architecture. Colours reflect service checks, rather than direct tests of each connection.</p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {["Render", "Neon", "Vercel"].map(name => {
            const service = services.find(item => item.name === name);
            const status = service?.status ?? "unknown";
            const statusColor =
              status === "online" ? "text-[#5ee2a0]" :
              status === "offline" ? "text-[#ff737d]" :
              status === "degraded" ? "text-[#f6c86b]" : "text-[#8c929c]";

            return (
              <article key={name} className={`rounded-2xl border bg-[#14171c] p-6 ${selectedService === name ? "border-[#8eafd9] ring-2 ring-[#8eafd9]" : "border-[#30343b]"}`}>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{name}</h2>
                  <span className={`text-xs font-semibold uppercase ${statusColor}`}>
                    ● {loading && !service ? "Checking" : status}
                  </span>
                </div>
                <p className="text-sm text-[#8c929c]">{serviceDetails[name].description}</p>
                <div className="mt-7 text-3xl font-semibold tabular-nums">
                  {service?.latency_ms != null ? `${service.latency_ms} ms` : "—"}
                </div>
                <p className="mt-1 text-xs text-[#8c929c]">Response time</p>
                <div className="mt-6 border-t border-[#30343b] pt-4 text-xs text-[#b4b8c0]">
                  {service?.detail ?? "Waiting for telemetry"}
                </div>
                <a
                  href={serviceDetails[name].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs text-[#9db9e4] hover:text-white"
                >
                  Open service ↗
                </a>
              </article>
            );
          })}
        </div>

        <section className="rounded-2xl border border-[#30343b] bg-[#14171c] p-5 md:p-6">
          <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">Uptime history</h2><p className="mt-1 text-xs text-[#8c929c]">Last 24 hours · Each block represents 30 minutes</p></div><div className="flex flex-wrap gap-3 text-xs text-[#8c929c]"><span className="text-[#5ee2a0]">● Online</span><span className="text-[#f6c86b]">● Degraded</span><span className="text-[#ff737d]">● Offline</span><span>● No observation</span></div></div>
          {data?.history_available===false && <p role="status" className="mt-4 text-sm text-[#f6c86b]">History storage is unavailable. Current checks are still shown.</p>}
          <div className="mt-6 space-y-6">
            {['Vercel','Render','Neon'].map(name=>{
              const history=data?.history?.[name];
              return <div key={name}>
                <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{name}</span><span className="text-[#b4b8c0]">{history?.availability_pct!=null ? `${history.availability_pct.toLocaleString(getLocale())}% of observed checks online` : 'Awaiting observations'}</span></div>
                <div className="flex h-9 gap-1" aria-label={`${name} uptime observations`}>
                  {(history?.blocks ?? Array.from({length:48},()=>({start:'',status:'unknown',checks:0}))).map((block,index)=><div key={index} tabIndex={0} role="img" aria-label={`${block.start ? date(block.start) : 'No observation'} · ${block.status} · ${block.checks} checks`} title={`${block.start ? date(block.start) : 'No observation'} · ${block.status} · ${block.checks} checks`} className="min-w-0 flex-1 rounded-sm focus:outline-2 focus:outline-white" style={{background:color(block.status),opacity:block.checks ? 1 : 0.3}}/>) }
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#8c929c]"><span>24 hours ago</span><span>{history?.sample_count ?? 0} recorded checks</span><span>Now</span></div>
              </div>;
            })}
          </div>
          <p className="mt-5 text-xs leading-5 text-[#8c929c]">Checks are recorded while this page is open. Grey blocks mean no observations; gaps do not count as uptime. A block shows the worst status observed in that period.</p>
        </section>

        <section className="rounded-2xl border border-[#30343b] bg-[#14171c] p-5 md:p-6">
          <h2 className="text-lg font-semibold">Deployment details</h2>
          <p className="mt-1 text-xs text-[#8c929c]">Production services, release versions, and the application currently serving this dashboard</p>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {['Vercel','Render','Neon'].map(name=>{
              const service=services.find(service=>service.name===name);
              const deployment=service?.deployment;
              const isDatabase=name==='Neon';
              const fields: [string, string | null | undefined][] = [
                ['Technology',name==='Vercel' ? 'React / Vite' : name==='Render' ? 'Python / Flask' : 'PostgreSQL'],
                ['Service URL',isDatabase ? 'Managed database · private connection' : service?.endpoint],
                ['Health',service?.status],
                ['HTTP status',service?.http_status != null ? String(service.http_status) : isDatabase ? 'SQL query check' : null],
                ['Response time',service?.latency_ms != null ? `${service.latency_ms} ms` : null],
                ['Last checked',data?.checked_at ? date(data.checked_at) : null],
                ...(!isDatabase ? [
                  ['Environment',deployment?.environment],
                  ['Commit',deployment?.commit],
                  ['Branch',deployment?.branch],
                  ['Built at',deployment?.built_at ? date(deployment.built_at) : null],
                ] as [string, string | null | undefined][] : []),
              ];
              return <article key={name} className="min-w-0 rounded-xl border border-[#30343b] bg-[#0e1116] p-5">
                <div className="flex justify-between gap-2"><h3 className="font-semibold">{name}</h3><span className="text-xs" style={{color:color(service?.status)}}>{service?.status || 'Checking'}</span></div>
                <dl className="mt-4 space-y-3 text-sm">
                  {fields.map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-[#8c929c]">{label}</dt><dd className="max-w-full break-words text-right text-xs [overflow-wrap:anywhere]" title={value ?? undefined}>{label==='Commit' && value ? <span className="font-mono">{value.slice(0,12)}</span> : value || 'Not reported'}</dd></div>)}
                </dl>
                {!isDatabase && !deployment && <p className="mt-4 text-xs leading-5 text-[#f6c86b]">The service is not publishing release metadata yet. Commit, branch, environment, and build time will appear after the updated application is deployed.</p>}
                {isDatabase && <p className="mt-4 text-xs leading-5 text-[#8c929c]">Managed database. Credentials and connection strings are kept private; application releases are listed separately.</p>}
              </article>;
            })}
          </div>
          {data?.current_application && <div className="mt-4 rounded-xl border border-[#30343b] bg-[#0e1116] p-5">
            <h3 className="font-semibold">Current dashboard application</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
              {([
                ['Environment',data.current_application.environment],
                ['Commit',data.current_application.commit?.slice(0,12)],
                ['Branch',data.current_application.branch],
                ['Working changes',data.current_application.uncommitted_changes == null ? 'Not reported' : data.current_application.uncommitted_changes ? 'Uncommitted changes present' : 'Clean checkout'],
              ] as [string,string | undefined][]).map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-[#8c929c]">{label}</dt><dd className="mt-1 break-all">{value || 'Not reported'}</dd></div>)}
            </dl>
            <p className="mt-4 text-xs text-[#8c929c]">Current application details describe the server serving this dashboard. Production versions above come from each monitored service.</p>
          </div>}
          <p className="mt-4 text-xs text-[#8c929c]">Build time is separate from deployment time. Health checks refresh every 15 seconds.</p>
        </section>

        <section className="rounded-2xl border border-[#30343b] bg-[#14171c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Service Health</h2>
              <p className="mt-1 text-xs text-[#8c929c]">
                HTTP availability and database query checks
              </p>
            </div>
            <div className="text-sm text-[#b4b8c0]">
              {services.length ? `${online} / ${services.length} responding` : "Awaiting data"}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {["Render", "Neon", "Vercel"].map(name => {
              const service = services.find(item => item.name === name);
              return (
                <div key={name} className="flex items-center justify-between rounded-xl border border-[#30343b] bg-[#0e1116] p-4">
                  <span className="font-medium">{name}</span>
                  <span className="text-sm text-[#b4b8c0]">
                    {service ? `${service.status.toUpperCase()}${service.latency_ms != null ? ` · ${service.latency_ms} ms` : ""}` : "Awaiting check"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-[#8c929c]">
            Last checked: {data?.checked_at ? new Date(data.checked_at).toLocaleString(getLocale()) : "Not yet checked"}
          </p>
        </section>

        <p className="text-xs text-[#8c929c]">
          Health checks measure endpoint reachability and database query response.
          Provider CPU, memory, connection counts, deployment history, and billing
          require separate authenticated provider integrations.
        </p>
      </div>
    </main>
  );
}
