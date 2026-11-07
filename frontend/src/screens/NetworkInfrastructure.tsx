import { useEffect, useState } from "react";

type Service = {
  name: string;
  status: "online" | "offline" | "degraded";
  latency_ms: number;
  http_status: number | null;
  detail: string;
};

type InfrastructureResponse = {
  success: boolean;
  checked_at: string;
  services: Service[];
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

        <div className="grid gap-4 md:grid-cols-3">
          {["Render", "Neon", "Vercel"].map(name => {
            const service = services.find(item => item.name === name);
            const status = service?.status ?? "unknown";
            const statusColor =
              status === "online" ? "text-[#5ee2a0]" :
              status === "offline" ? "text-[#ff737d]" :
              status === "degraded" ? "text-[#f6c86b]" : "text-[#8c929c]";

            return (
              <article key={name} className="rounded-2xl border border-[#30343b] bg-[#14171c] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{name}</h2>
                  <span className={`text-xs font-semibold uppercase ${statusColor}`}>
                    ● {loading && !service ? "Checking" : status}
                  </span>
                </div>
                <p className="text-sm text-[#8c929c]">{serviceDetails[name].description}</p>
                <div className="mt-7 text-3xl font-semibold tabular-nums">
                  {service ? `${service.latency_ms} ms` : "—"}
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
                    {service ? `${service.status.toUpperCase()} · ${service.latency_ms} ms` : "Awaiting check"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-[#8c929c]">
            Last checked: {data?.checked_at ? new Date(data.checked_at).toLocaleString() : "Not yet checked"}
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
