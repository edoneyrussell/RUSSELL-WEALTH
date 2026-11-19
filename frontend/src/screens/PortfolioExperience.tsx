import EmptyState, { emptyActionClass } from '../components/EmptyState';
import { Skeleton, DataStatus } from '../experience/Feedback';
import { useViewState } from '../experience/ViewState';
import { getLocale } from '../i18n/language.ts';
import { usePortfolio, type AccountScope } from "../hooks/usePortfolio";
import AccountSelector from "../components/AccountSelector";
import { useCustomerFetch, customerDemoNavigate } from "../demo/customerDemo";
import { useEffect, useMemo, useState } from "react";
import AssetLogo from "../components/AssetLogo";
import { buildPositionAllocation } from "../utils/portfolioAllocation";
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

const money = (value: number | string) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2
  }).format(Number(value));

const number = (value: number | string) =>
  Number(value).toLocaleString(getLocale(), {
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
  if (customerDemoNavigate(path)) return;
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
  const customerFetch = useCustomerFetch();
  const [accountScope, setAccountScope] = useViewState<AccountScope>('portfolio:account',() => {
    const account = new URLSearchParams(window.location.search).get('account_id');
    return account && /^\d+$/.test(account) && Number(account) > 0 ? Number(account) : 'all';
  },new URLSearchParams(location.search).has('account_id'));
  const { portfolio, loading, error, refresh, updatedAt } = usePortfolio(accountScope);
  const [search, setSearch] = useViewState('portfolio:search',() => new URLSearchParams(window.location.search).get('search') ?? '',new URLSearchParams(location.search).has('search'));
  const [sort, setSort] = useViewState('portfolio:sort','value');
  const [filter, setFilter] = useViewState('portfolio:filter','All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(false);
  const holdings = portfolio?.holdings ?? [];
  const total = Number(portfolio?.total_value ?? 0);
  const invested = holdings.reduce((sum, h) => sum + Number(h.market_value), 0);
  const cash = Number(portfolio?.cash_balance ?? 0);

  const allocation = useMemo(() => buildPositionAllocation(holdings), [holdings]);
  const visiblePositions = showAllPositions ? allocation : allocation.slice(0, 4);

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


  // RW_ACTIVE_PORTFOLIO_FX_V2
  const [displayCurrency, setDisplayCurrency] =
    useState<"CAD" | "USD" | "BSD">("CAD");

  const [cadToUsd, setCadToUsd] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    customerFetch("https://open.er-api.com/v6/latest/CAD")
      .then(response => {
        if (!response.ok) throw new Error("FX unavailable");
        return response.json();
      })
      .then(data => {
        const rate = Number(data?.rates?.USD);

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error("Invalid FX rate");
        }

        if (active) setCadToUsd(rate);
      })
      .catch(() => {
        if (active) setCadToUsd(null);
      });

    return () => { active = false; };
  }, []);

  const portfolioMoney = (value: number | string) => {
    const rate = displayCurrency === "CAD" ? 1 : cadToUsd;

    if (rate === null) return "FX unavailable";

    return new Intl.NumberFormat(getLocale(), {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 2,
    }).format(Number(value) * rate);
  };

  const shownMoney = (value: number | string) => hideBalance ? "••••••" : portfolioMoney(value);

  const card = "rounded-[20px] border border-[#2D3742] bg-[#161D26] p-5";
  const label = "text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8E9BAA]";

  return (
    <div className="rw-fintech-workspace rw-fintech-portfolio min-h-screen bg-[#090C10] px-4 pb-16 pt-7 text-[#F0F3F7] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1480px] space-y-6">

        <header data-tour="portfolio" className="flex flex-wrap items-start justify-between gap-4">
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
              onClick={() => { void refresh(); }}
              aria-label="Refresh portfolio"
              className="rounded-xl border border-[#34404D] bg-[#171E27] p-3 hover:bg-[#26313D]"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {!portfolio && <AccountSelector compact scope={accountScope} onScopeChange={setAccountScope} label="Portfolio account"/>}
        <DataStatus error={error} updatedAt={updatedAt} onRetry={()=>void refresh()}/>
        {loading && !portfolio && <Skeleton rows={4}/>}

        {portfolio && (
          <>
            <Panel className="rw-fintech-summary relative overflow-hidden p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -right-20 -top-36 size-[420px] rounded-full opacity-20 blur-[100px]"
                style={{ background: "#7998BA" }}
              />
              <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={label}>Total Portfolio Value</span>
                    <select
                      aria-label="Portfolio display currency"
                      value={displayCurrency}
                      onChange={event =>
                        setDisplayCurrency(event.target.value as "CAD" | "USD" | "BSD")
                      }
                      className="cursor-pointer rounded-md border border-[#405064] bg-[#141b24] px-2 py-1 text-[11px] font-semibold text-[#dce7f2] outline-none"
                    >
                      <option value="CAD">🇨🇦 CAD</option>
                      <option value="USD" disabled={cadToUsd === null}>🇺🇸 USD</option>
                      <option value="BSD" disabled={cadToUsd === null}>🇧🇸 BSD</option>
                    </select>
                  </div>
                  <p className="mt-4 break-all text-[39px] font-semibold tracking-[-0.055em] sm:text-[60px]">
                    {shownMoney(total)}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <AccountSelector compact scope={accountScope} onScopeChange={setAccountScope} label="Portfolio account" accountName={portfolio.account_name} />
                    <span className="text-xs text-[#8D9BAB]">
                      {holdings.length} active positions
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/markets")}
                  className="rw-fintech-primary flex items-center justify-center gap-2 rounded-xl bg-[#D9E2EC] px-6 py-3.5 text-sm font-semibold text-[#111820] hover:bg-white"
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
                { title: "Largest Position", value: largest?.symbol ?? "—", icon: PieIcon, detail: largest ? pct(invested ? Number(largest.market_value) / invested * 100 : 0) + " of portfolio" : "No positions" }
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
                  <p className="mt-2 text-xs text-[#8E9BAB]">Every holding, with its current value and share of invested assets · Cash shown separately.</p>
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
                              nameKey="symbol"
                              innerRadius={77}
                              outerRadius={108}
                              paddingAngle={0}
                              stroke="none"
                            >
                              {allocation.map(item => (
                                <Cell key={item.symbol} fill={item.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                const item = payload?.[0]?.payload as (typeof allocation)[number] | undefined;
                                if (!active || !item) return null;
                                return (
                                  <div className="max-w-[260px] rounded-xl border border-[#465362] bg-[#202A35] p-3 text-xs text-[#F2F4F7] shadow-xl">
                                    <p className="font-semibold">{item.symbol} · {item.name}</p>
                                    <p className="mt-2">{shownMoney(item.value)} · {pct(item.weight)}</p>
                                    <p className="mt-1 text-[#CBD5E0]">{number(item.quantity)} units</p>
                                  </div>
                                );
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
                      <div key={item.symbol} data-allocation-symbol={item.symbol}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="flex items-center gap-2 text-[#CBD5E0]">
                            <i className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                            <span><strong>{item.symbol}</strong><span className="mt-1 block text-[11px] text-[#8E9BAB]">{item.name}</span></span>
                          </span>
                          <span className="shrink-0 text-right"><strong className="block">{pct(item.weight)}</strong><span className="mt-1 block text-[11px] text-[#AAB8C8]">{shownMoney(item.value)}</span></span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#29323D]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: item.color,
                              width: `${item.weight}%`
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
                  Showing {Math.min(visiblePositions.length, holdings.length)} of {holdings.length} holdings · Percentages of invested assets; cash excluded.
                </p>

                <div id="position-breakdown" className="mt-7 space-y-5">
                  {visiblePositions.map((h, index) => (
                      <div key={h.symbol} data-position-symbol={h.symbol}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="text-[11px] text-[#738293]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <AssetLogo symbol={h.symbol} name={h.name} size={28} />
                            <span className="truncate text-sm font-semibold">{h.symbol}</span>
                          </div>
                          <span className="text-xs text-[#BBC7D5]">
                            {pct(invested ? Number(h.market_value) / invested * 100 : 0)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#28313B]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: h.color,
                              width: `${h.weight}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  {holdings.length === 0 && (
                    <p className="text-sm text-[#9CA9B8]">No investments recorded yet.</p>
                  )}
                </div>

                {holdings.length > 4 && (
                  <button
                    type="button"
                    aria-expanded={showAllPositions}
                    aria-controls="position-breakdown"
                    onClick={() => setShowAllPositions(value => !value)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#415063] px-4 py-3 text-sm text-[#D0DAE6] hover:bg-[#25313F]"
                  >
                    {showAllPositions ? "Show less" : `View more (${holdings.length - 4} more)`}
                    <ChevronDown size={16} className={showAllPositions ? "rotate-180" : ""} />
                  </button>
                )}

                <div className="mt-7 border-t border-[#303A45] pt-5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9BA8B7]">Portfolio concentration</span>
                    <span className="font-medium">
                      {largest ? pct(invested ? Number(largest.market_value) / invested * 100 : 0) : "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#788797]">
                    Share of invested assets held in your largest position.
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
                  const weight = invested ? Number(h.market_value) / invested * 100 : 0;

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
                        <AssetLogo symbol={h.symbol} name={h.name} size={44} />
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
                              {pct(weight)} of invested assets · {assetClass(h)}
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

                {!error && filtered.length === 0 && (
                  <EmptyState title={holdings.length === 0 ? "No investments yet" : "No holdings match your filters"}
                    description={holdings.length === 0 ? "Add simulated funds, then explore the markets to find your first investment. Your holdings will appear here after a purchase." : "Try another search or reset your filters to see your holdings."}>
                    {holdings.length === 0 ? <>
                      <button className={emptyActionClass} onClick={() => navigate('/deposit')}>Add funds</button>
                      <button className={emptyActionClass} onClick={() => navigate('/markets')}>Explore markets</button>
                    </> : <button className={emptyActionClass} onClick={() => { setSearch(''); setFilter('All'); }}>Reset filters</button>}
                  </EmptyState>
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
