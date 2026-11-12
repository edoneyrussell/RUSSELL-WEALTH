import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, ChevronDown, ChevronRight, Layers3,
  Search, Wallet, BriefcaseBusiness, PieChart as PieIcon,
  RefreshCw, SlidersHorizontal
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

type Holding = {
  symbol: string;
  name: string;
  type?: string;
  asset_type?: string;
  currency?: string;
  quantity: string;
  price: string;
  market_value: string;
};

type PortfolioData = {
  account_name: string;
  currency: string;
  cash_balance: string;
  invested_value: string;
  total_value: string;
  holdings: Holding[];
};

const colors = [
  "#B6C8DF", "#718DAF", "#526B87",
  "#8D9CA8", "#D5DCE4", "#53606D",
  "#8C83A4", "#547D78"
];

const money = (value: number | string) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2
  }).format(Number(value));

const number = (value: number | string) =>
  Number(value).toLocaleString("en-CA", {
    maximumFractionDigits: 6
  });

const pct = (value: number) =>
  `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

function assetClass(h: Holding) {
  const t = (h.type || h.asset_type || "").toUpperCase();
  if (t.includes("CRYPTO")) return "Crypto";
  if (t.includes("REIT")) return "REITs";
  if (t.includes("BOND")) return "Bonds";
  if (t.includes("ETF")) return "ETFs";
  if (t.includes("STOCK") || t.includes("EQUITY")) return "Stocks";
  return "Other";
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" });
}

function Panel({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={
      "rounded-[22px] border border-[#2B333D] bg-[#12171E] " + className
    }>
      {children}
    </section>
  );
}

export default function PortfolioExperience() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("value");
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/customer/portfolio", {
          credentials: "same-origin"
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load portfolio");
        }

        if (active) {
          setPortfolio(result);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Portfolio unavailable");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    const refresh = () => { void load(); };
    window.addEventListener("portfolio-updated", refresh);
    window.addEventListener("rw:portfolio-updated", refresh);

    return () => {
      active = false;
      window.removeEventListener("portfolio-updated", refresh);
      window.removeEventListener("rw:portfolio-updated", refresh);
    };
  }, [refreshKey]);

  const holdings = portfolio?.holdings ?? [];
  const total = Number(portfolio?.total_value ?? 0);
  const invested = Number(portfolio?.invested_value ?? 0);
  const cash = Number(portfolio?.cash_balance ?? 0);

  const allocation = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const h of holdings) {
      const type = assetClass(h);
      grouped.set(type, (grouped.get(type) ?? 0) + Number(h.market_value));
    }

    if (cash > 0) grouped.set("Cash", cash);

    return Array.from(grouped.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [holdings, cash]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return holdings
      .filter(h =>
        (filter === "All" || assetClass(h) === filter) &&
        (!q ||
          h.symbol.toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        if (sort === "symbol") return a.symbol.localeCompare(b.symbol);
        if (sort === "quantity") return Number(b.quantity) - Number(a.quantity);
        return Number(b.market_value) - Number(a.market_value);
      });
  }, [holdings, search, sort, filter]);

  const largest = [...holdings].sort(
    (a, b) => Number(b.market_value) - Number(a.market_value)
  )[0];

  const shownMoney = (value: number | string) =>
    hideBalance ? "••••••" : money(value);

  const card = "rounded-[20px] border border-[#2D3742] bg-[#161D26] p-5";
  const label = "text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8E9BAA]";

  return (
    <div className="min-h-screen bg-[#090C10] px-4 pb-16 pt-7 text-[#F0F3F7] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1480px] space-y-6">

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={label}>Russell Wealth / Private Client</p>
            <h1 className="mt-3 font-['Lora'] text-[34px] font-semibold tracking-[-0.04em] sm:text-[48px]">
              Your <span className="italic text-[#B8C6D5]">Portfolio.</span>
            </h1>
            <p className="mt-2 text-sm text-[#929FAC]">
              A complete view of your investment positions and allocation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHideBalance(v => !v)}
              className="rounded-xl border border-[#34404D] bg-[#171E27] px-4 py-3 text-xs text-[#C4CED9] hover:bg-[#26313D]"
            >
              {hideBalance ? "Show values" : "Hide values"}
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey(k => k + 1)}
              aria-label="Refresh portfolio"
              className="rounded-xl border border-[#34404D] bg-[#171E27] p-3 hover:bg-[#26313D]"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-[#705342] bg-[#2A211C] p-4 text-sm text-[#F1C7A8]">
            {error}
          </div>
        )}

        {loading && !portfolio && (
          <div className="rounded-2xl border border-[#2D3742] p-8 text-sm text-[#A6B3C1]">
            Loading your portfolio...
          </div>
        )}

        {portfolio && (
          <>
            <Panel className="relative overflow-hidden p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -right-20 -top-36 size-[420px] rounded-full opacity-20 blur-[100px]"
                style={{ background: "#7998BA" }}
              />
              <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={label}>Total Portfolio Value</span>
                    <span className="rounded-md border border-[#405064] px-2 py-1 text-[10px] text-[#A7B7C9]">
                      CAD
                    </span>
                  </div>
                  <p className="mt-4 break-all text-[39px] font-semibold tracking-[-0.055em] sm:text-[60px]">
                    {shownMoney(total)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[#425266] bg-[#263342] px-3 py-1.5 text-[11px] text-[#CFDBE8]">
                      {portfolio.account_name || "Investment Account"}
                    </span>
                    <span className="text-xs text-[#8D9BAB]">
                      {holdings.length} active positions
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/markets")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#D9E2EC] px-6 py-3.5 text-sm font-semibold text-[#111820] hover:bg-white"
                >
                  Explore & Trade <ArrowUpRight size={17} />
                </button>
              </div>
            </Panel>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Invested Assets", value: shownMoney(invested), icon: BriefcaseBusiness, detail: pct(total ? invested / total * 100 : 0) + " of portfolio" },
                { title: "Available Cash", value: shownMoney(cash), icon: Wallet, detail: pct(total ? cash / total * 100 : 0) + " of portfolio" },
                { title: "Active Holdings", value: String(holdings.length), icon: Layers3, detail: "Individual positions" },
                { title: "Largest Position", value: largest?.symbol ?? "—", icon: PieIcon, detail: largest ? pct(total ? Number(largest.market_value) / total * 100 : 0) + " of portfolio" : "No positions" }
              ].map(item => (
                <div key={item.title} className={card}>
                  <div className="flex items-center justify-between">
                    <p className={label}>{item.title}</p>
                    <item.icon size={17} className="text-[#9EADC0]" />
                  </div>
                  <p className="mt-6 truncate text-[26px] font-semibold tracking-[-0.04em]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs text-[#8F9CAB]">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel className="p-5 sm:p-7">
                <div className="mb-6">
                  <p className={label}>Portfolio Composition</p>
                  <h2 className="mt-2 text-xl font-semibold">Asset Allocation</h2>
                </div>

                <div className="grid items-center gap-5 sm:grid-cols-[240px_1fr]">
                  <div className="relative mx-auto h-[240px] w-full max-w-[240px]">
                    {allocation.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocation}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={77}
                              outerRadius={108}
                              paddingAngle={3}
                              stroke="none"
                            >
                              {allocation.map(item => (
                                <Cell key={item.name} fill={item.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={value => money(Number(value))}
                              contentStyle={{
                                background: "#202A35",
                                border: "1px solid #465362",
                                borderRadius: 12,
                                color: "#F2F4F7"
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[10px] uppercase tracking-widest text-[#91A0B0]">Assets</span>
                          <strong className="mt-1 text-2xl">{holdings.length}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[#9BA7B5]">
                        No allocation data
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {allocation.map(item => (
                      <div key={item.name}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="flex items-center gap-2 text-[#CBD5E0]">
                            <i className="size-2.5 rounded-full" style={{ background: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-semibold">{pct(total ? item.value / total * 100 : 0)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#29323D]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: item.color,
                              width: `${total ? item.value / total * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel className="p-5 sm:p-7">
                <p className={label}>Portfolio Insights</p>
                <h2 className="mt-2 text-xl font-semibold">Position Breakdown</h2>
                <p className="mt-2 text-xs text-[#8E9BAB]">
                  Based on current recorded asset values.
                </p>

                <div className="mt-7 space-y-5">
                  {[...holdings]
                    .sort((a, b) => Number(b.market_value) - Number(a.market_value))
                    .slice(0, 5)
                    .map((h, index) => (
                      <div key={h.symbol}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="text-[11px] text-[#738293]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="truncate text-sm font-semibold">{h.symbol}</span>
                          </div>
                          <span className="text-xs text-[#BBC7D5]">
                            {pct(total ? Number(h.market_value) / total * 100 : 0)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#28313B]">
                          <div
                            className="h-full rounded-full bg-[#9BB1CA]"
                            style={{
                              width: `${total ? Number(h.market_value) / total * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  {holdings.length === 0 && (
                    <p className="text-sm text-[#9CA9B8]">No investments recorded yet.</p>
                  )}
                </div>

                <div className="mt-7 border-t border-[#303A45] pt-5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9BA8B7]">Portfolio concentration</span>
                    <span className="font-medium">
                      {largest ? pct(total ? Number(largest.market_value) / total * 100 : 0) : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#788797]">
                    Share of total portfolio held in your largest position.
                  </p>
                </div>
              </Panel>
            </div>

            <Panel className="overflow-hidden">
              <div className="border-b border-[#303A45] p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className={label}>Investment Inventory</p>
                    <h2 className="mt-2 text-2xl font-semibold">Your Holdings</h2>
                    <p className="mt-2 text-xs text-[#91A0AF]">
                      {holdings.length} positions · Select a holding for more details
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/markets")}
                    className="flex items-center gap-2 rounded-xl border border-[#415063] px-4 py-2.5 text-xs text-[#D0DAE6] hover:bg-[#25313F]"
                  >
                    Trade Assets <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex min-w-[190px] flex-1 items-center gap-3 rounded-xl border border-[#34404D] bg-[#0D1218] px-4">
                    <Search size={16} className="shrink-0 text-[#8F9FB0]" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search your holdings..."
                      aria-label="Search holdings"
                      className="w-full bg-transparent py-3 text-base text-white outline-none placeholder:text-[#748293]"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#34404D] bg-[#0D1218] px-3">
                    <SlidersHorizontal size={14} className="text-[#8797A9]" />
                    <select
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      aria-label="Filter holdings"
                      className="max-w-[130px] bg-transparent py-3 text-xs text-[#D0DAE6] outline-none"
                    >
                      {["All", "Stocks", "ETFs", "REITs", "Bonds", "Crypto", "Other"].map(c => (
                        <option key={c} value={c} className="bg-[#151B23]">
                          {c === "All" ? "All Assets" : c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    aria-label="Sort holdings"
                    className="rounded-xl border border-[#34404D] bg-[#0D1218] px-4 py-3 text-xs text-[#D0DAE6] outline-none"
                  >
                    <option value="value">Highest Value</option>
                    <option value="symbol">Symbol A–Z</option>
                    <option value="quantity">Most Shares</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 p-3 sm:p-5">
                {filtered.map(h => {
                  const active = expanded === h.symbol;
                  const weight = total ? Number(h.market_value) / total * 100 : 0;

                  return (
                    <div
                      key={h.symbol}
                      className={
                        "overflow-hidden rounded-2xl border transition-colors " +
                        (active
                          ? "border-[#60758C] bg-[#1E2834]"
                          : "border-[#29343F] bg-[#161D25] hover:border-[#526477]")
                      }
                    >
                      <button
                        type="button"
                        aria-expanded={active}
                        onClick={() => setExpanded(active ? null : h.symbol)}
                        className="flex w-full items-center gap-3 p-4 text-left sm:gap-5"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#435267] bg-[#293747] text-xs font-bold">
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{h.symbol}</p>
                          <p className="mt-1 truncate text-xs text-[#94A2B2]">{h.name}</p>
                        </div>
                        <div className="hidden text-right md:block">
                          <p className="text-xs text-[#D2DCE6]">{number(h.quantity)} shares</p>
                          <p className="mt-1 text-[11px] text-[#8493A3]">{assetClass(h)}</p>
                        </div>
                        <div className="min-w-[100px] text-right">
                          <p className="text-sm font-semibold">{shownMoney(h.market_value)}</p>
                          <p className="mt-1 text-[11px] text-[#9DABBA]">{pct(weight)} weight</p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={
                            "shrink-0 text-[#9DABBA] transition-transform " +
                            (active ? "rotate-180" : "")
                          }
                        />
                      </button>

                      {active && (
                        <div className="border-t border-[#394656] px-4 pb-5 pt-4 sm:px-6">
                          <div className="grid gap-4 sm:grid-cols-3">
                            {[
                              ["Shares Owned", number(h.quantity)],
                              ["Recorded Unit Price", shownMoney(h.price)],
                              ["Position Value", shownMoney(h.market_value)]
                            ].map(([title, value]) => (
                              <div key={title} className="rounded-xl bg-[#111922] p-4">
                                <p className={label}>{title}</p>
                                <p className="mt-2 text-lg font-semibold">{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-[#9DABBA]">
                              {pct(weight)} of total portfolio · {assetClass(h)}
                            </p>
                            <button
                              type="button"
                              onClick={() => navigate("/markets")}
                              className="flex items-center gap-1 text-xs font-semibold text-[#D5E0ED] hover:text-white"
                            >
                              Open Trade <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#9AA8B7]">
                    {holdings.length === 0
                      ? "No holdings yet. Open Trade to explore investments."
                      : "No holdings match your filters."}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-t border-[#303A45] px-5 py-4 text-[11px] text-[#8594A4]">
                <span>Showing {filtered.length} of {holdings.length} holdings</span>
                <span>All values in CAD · Allocation includes cash</span>
              </div>
            </Panel>

            <p className="pb-4 text-center text-[11px] text-[#6E7D8D]">
              Russell Wealth is a fictional investment platform. Figures reflect
              recorded simulated account data, not verified live market performance.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
