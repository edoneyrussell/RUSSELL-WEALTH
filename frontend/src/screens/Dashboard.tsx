import WatchlistOverlay from "../components/WatchlistOverlay";
import PortfolioHistoryChart from "../components/PortfolioHistoryChart";
import AssetLogo from "./../components/AssetLogo";
import { useEffect, useState } from "react";
import { logout } from "../auth";
import {
  ArrowUpRight,
  ArrowLeftRight,
  BriefcaseBusiness,
  Wallet,
  Search,
  RefreshCw,
  TrendingUp,
  Layers3,
  ChevronRight,
} from "lucide-react";

import MarketSearch from "../components/MarketSearch";
import HoldingsList from "../components/HoldingsList";
import { useTrading } from "../hooks/useTrading";
import { usePortfolio, formatCAD } from "../hooks/usePortfolio";

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" });
}

const panel =
  "rounded-[22px] border border-[#2B333D] bg-[#12171E]";

const card =
  "rounded-[20px] border border-[#2D3742] bg-[#161D26] p-5";

const label =
  "text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8E9BAA]";

const field =
  "w-full rounded-xl border border-[#34404D] bg-[#090C10] px-4 py-3 text-sm text-[#F0F3F7] outline-none focus:border-[#7998BA]";

export default function Dashboard() {
  const { portfolio, error } = usePortfolio();
  const trading = useTrading();
  const [showBalances, setShowBalances] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const [greeting, setGreeting] = useState(getGreeting);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "same-origin"
        });

        if (!response.ok) return;

        const data = await response.json();
        setProfilePhoto(data.profile_photo ?? null);
      } catch (error) {
        console.error("Profile photo loading failed:", error);
      }
    };

    loadProfilePhoto();
    window.addEventListener("rw-profile-updated", loadProfilePhoto);

    return () => {
      window.removeEventListener("rw-profile-updated", loadProfilePhoto);
    };
  }, []);


  useEffect(() => {
    const interval = window.setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const money = (value: string | number) =>
    showBalances ? formatCAD(String(value)) : "••••••";

  const holdings = portfolio?.holdings ?? [];

  const largest = [...holdings]
    .sort(
      (a, b) =>
        Number(b.market_value) - Number(a.market_value)
    )
    .slice(0, 4);

  const total = portfolio
    ? money(portfolio.total_value)
    : error
      ? "Unavailable"
      : "Loading...";

  return (
    <main
      data-name="Modern Russell Wealth Dashboard"
      className="min-h-screen bg-[#090C10] px-4 pb-24 pt-7 font-['Inter'] text-[#F0F3F7] sm:px-7 lg:px-10"
    >
      <div className="mx-auto max-w-[1480px] space-y-6">

        {/* HEADER */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className={label}>
              RUSSELL WEALTH / PRIVATE CLIENT
            </p>

            <div className="mt-3 flex items-center gap-3 sm:gap-4">
              <div className="size-11 shrink-0 overflow-hidden rounded-full border-2 border-[#526780] bg-[#202A38] sm:size-[54px]">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Edoney Russell"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center font-['Inter'] text-sm font-semibold text-[#B8C6D5]">
                    ER
                  </div>
                )}
              </div>

              <h1 className="font-['Lora'] text-[34px] font-semibold tracking-[-0.04em] sm:text-[48px]">
                {greeting},{" "}
                <span className="italic text-[#B8C6D5]">
                  Edoney.
                </span>
              </h1>
            </div>

            <p className="mt-2 text-sm text-[#929FAC]">
              Your financial world, at a glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="fixed right-4 top-3 z-[100] flex items-center justify-center rounded-lg border border-[#34404D] bg-[#171E27] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#F0F3F7] shadow-lg transition hover:border-white hover:bg-[#26313D] sm:hidden"
            >
              Log Out
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new Event("russellwealth:open-market-search")
                )
              }
              className="flex items-center gap-3 rounded-xl border border-[#34404D] bg-[#171E27] px-4 py-3 text-xs text-[#C4CED9] transition hover:bg-[#26313D]"
            >
              <Search size={16} />
              Search Markets
            </button>

            <MarketSearch triggerOnly />

            <button
              type="button"
              onClick={() => setShowBalances(v => !v)}
              className="rounded-xl border border-[#34404D] bg-[#171E27] px-4 py-3 text-xs text-[#C4CED9] hover:bg-[#26313D]"
            >
              {showBalances ? "Hide Values" : "Show Values"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#705342] bg-[#2A211C] p-4 text-sm text-[#F1C7A8]"
          >
            {error}
          </div>
        )}

        {/* PORTFOLIO HERO */}
        <section className={`${panel} relative overflow-hidden p-6 sm:p-8`}>
          <div
            className="pointer-events-none absolute -right-20 -top-36 size-[420px] rounded-full opacity-20 blur-[100px]"
            style={{ background: "#7998BA" }}
          />

          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3">
                <span className={label}>
                  TOTAL PORTFOLIO VALUE
                </span>

                <span className="rounded-md border border-[#405064] px-2 py-1 text-[10px] text-[#A7B7C9]">
                  CAD
                </span>
              </div>

              <p className="mt-4 break-all text-[39px] font-semibold tracking-[-0.055em] sm:text-[60px]">
                {total}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#425266] bg-[#263342] px-3 py-1.5 text-[11px] text-[#CFDBE8]">
                  {portfolio?.account_name || "Investment Account"}
                </span>

                <span className="text-xs text-[#8D9BAB]">
                  {holdings.length} active positions
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/portfolio")}
              className="flex items-center gap-2 rounded-xl border border-[#405064] bg-[#263342] px-5 py-3 text-sm text-[#CFDBE8] transition hover:bg-[#34475C]"
            >
              View Portfolio
              <ArrowUpRight size={16} />
            </button>
          </div>
        
          <div className="relative mt-8 border-t border-[#2B333D] pt-7">
            <PortfolioHistoryChart
              value={portfolio ? Number(portfolio.total_value) : null}
            />
          </div>
        </section>

        {/* METRICS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className={card}>
            <div className="flex items-center justify-between">
              <span className={label}>INVESTED VALUE</span>
              <TrendingUp size={18} className="text-[#B8C6D5]" />
            </div>

            <p className="mt-5 text-[28px] font-semibold tracking-tight">
              {portfolio
                ? money(portfolio.invested_value)
                : "Loading..."}
            </p>

            <p className="mt-2 text-xs text-[#8E9BAA]">
              Current value of your holdings
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between">
              <span className={label}>CASH BALANCE</span>
              <Wallet size={18} className="text-[#B8C6D5]" />
            </div>

            <p className="mt-5 text-[28px] font-semibold tracking-tight">
              {portfolio
                ? money(portfolio.cash_balance)
                : "Loading..."}
            </p>

            <p className="mt-2 text-xs text-[#8E9BAA]">
              Available account cash
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between">
              <span className={label}>ACTIVE POSITIONS</span>
              <Layers3 size={18} className="text-[#B8C6D5]" />
            </div>

            <p className="mt-5 text-[28px] font-semibold tracking-tight">
              {holdings.length}
            </p>

            <p className="mt-2 text-xs text-[#8E9BAA]">
              Assets currently held
            </p>
          </div>
        </section>

        {/* MAIN GRID */}
        <section className="grid grid-cols-1 gap-6">

          {/* LEFT */}
          <div className="min-w-0 space-y-6">

            {/* HOLDINGS */}
            <div className={`${panel} overflow-hidden p-5 sm:p-7`}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={label}>YOUR INVESTMENTS</p>

                  <h2 className="mt-2 font-['Lora'] text-[25px]">
                    Your Holdings
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/portfolio")}
                  className="flex items-center gap-1 text-xs text-[#B8C6D5] hover:text-white"
                >
                  View All
                  <ChevronRight size={15} />
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <HoldingsList />
              </div>
            </div>

            {/* LARGEST POSITIONS */}
            <div className={`${panel} p-5 sm:p-7`}>
              <div className="mb-6">
                <p className={label}>PORTFOLIO COMPOSITION</p>

                <h2 className="mt-2 font-['Lora'] text-[25px]">
                  Largest Positions
                </h2>
              </div>

              {largest.length === 0 ? (
                <p className="text-sm text-[#8E9BAA]">
                  No holdings to display.
                </p>
              ) : (
                <div className="space-y-5">
                  {largest.map(holding => {
                    const value = Number(holding.market_value);
                    const invested = Number(
                      portfolio?.invested_value ?? 0
                    );

                    const percentage =
                      invested > 0
                        ? (value / invested) * 100
                        : 0;

                    return (
                      <div key={holding.symbol}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex min-w-0 items-center gap-3"><AssetLogo symbol={holding.symbol} name={holding.name} /><div className="min-w-0"><p className="text-sm font-semibold">
                              {holding.symbol}
                            </p>
                            <p className="text-xs text-[#8E9BAA]">
                              {holding.name}
                            </p></div></div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {money(holding.market_value)}
                            </p>
                            <p className="text-xs text-[#8E9BAA]">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="h-[5px] overflow-hidden rounded-full bg-[#26313D]">
                          <div
                            className="h-full rounded-full bg-[#8DA9C9]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, percentage)
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT - FULL WIDTH MARKET ACCESS */}
          <div className="min-w-0">

            {/* TRADE TICKET */}
            <div className={`${panel} p-5 sm:p-6`}>
              <div className="mb-5">
                <p className={label}>MARKET ACCESS</p>

                <h2 className="mt-2 font-['Lora'] text-[25px]">
                  Trade Assets
                </h2>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[#090C10] p-1">
                {(["BUY", "SELL"] as const).map(direction => (
                  <button
                    key={direction}
                    type="button"
                    onClick={() => trading.setDirection(direction)}
                    className={`rounded-lg py-3 text-xs font-semibold transition ${
                      trading.direction === direction
                        ? "bg-[#B8C6D5] text-[#090C10]"
                        : "text-[#8E9BAA] hover:bg-[#1D2630]"
                    }`}
                  >
                    {direction === "BUY" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className={label}>ASSET SYMBOL</span>

                  <input
                    aria-label="Symbol"
                    value={trading.symbol}
                    onChange={e =>
                      trading.setSymbol(e.target.value.toUpperCase())
                    }
                    placeholder="VDY, XEG, RY, SHOP"
                    className={`${field} mt-2`}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={label}>ORDER TYPE</span>

                    <div className={`${field} mt-2`}>
                      Market
                    </div>
                  </div>

                  <label>
                    <span className={label}>QUANTITY</span>

                    <input
                      aria-label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={trading.quantity}
                      onChange={e =>
                        trading.setQuantity(e.target.value)
                      }
                      className={`${field} mt-2`}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={trading.submitting}
                  onClick={() => void trading.submitTrade()}
                  className="w-full rounded-xl bg-[#B8C6D5] px-5 py-4 text-sm font-semibold text-[#090C10] transition hover:bg-[#D5DFEA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {trading.submitting
                    ? "Processing..."
                    : trading.direction === "BUY"
                      ? "Buy Shares"
                      : "Sell Shares"}
                </button>

                {trading.error && (
                  <p role="alert" className="text-xs text-[#F1A8A8]">
                    {trading.error}
                  </p>
                )}

                {trading.message && (
                  <p role="status" className="text-xs text-[#A8D9BE]">
                    {trading.message}
                  </p>
                )}
              </div>
            </div>

          </div>
        </section>


        {/* BOTTOM ACCOUNT & ACTION CARDS */}
        <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          <div className={`${panel} h-full p-5 sm:p-6`}>
              <p className={label}>ACCOUNT OVERVIEW</p>

              <h2 className="mb-6 mt-2 font-['Lora'] text-[25px]">
                Accounts
              </h2>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BriefcaseBusiness
                      size={18}
                      className="text-[#B8C6D5]"
                    />

                    <span className="text-xs text-[#A6B3C1]">
                      Investments
                    </span>
                  </div>

                  <span className="text-sm font-medium">
                    {portfolio
                      ? money(portfolio.invested_value)
                      : "Loading..."}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Wallet
                      size={18}
                      className="text-[#B8C6D5]"
                    />

                    <span className="text-xs text-[#A6B3C1]">
                      Cash
                    </span>
                  </div>

                  <span className="text-sm font-medium">
                    {portfolio
                      ? money(portfolio.cash_balance)
                      : "Loading..."}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#2B333D] pt-5">
                  <span className="text-xs text-[#A6B3C1]">
                    Total Balance
                  </span>

                  <span className="text-sm font-semibold">
                    {total}
                  </span>
                </div>
              </div>
            </div>
          <div className={`${panel} h-full p-5 sm:p-6`}>
              <p className={label}>EXPLORE</p>

              <h2 className="mb-5 mt-2 font-['Lora'] text-[25px]">
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/markets")}
                  className="flex flex-col items-start gap-4 rounded-xl border border-[#34404D] bg-[#171E27] p-4 text-left transition hover:bg-[#26313D]"
                >
                  <ArrowLeftRight
                    size={20}
                    className="text-[#B8C6D5]"
                  />
                  <span className="text-xs">
                    Trade & Explore
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/portfolio")}
                  className="flex flex-col items-start gap-4 rounded-xl border border-[#34404D] bg-[#171E27] p-4 text-left transition hover:bg-[#26313D]"
                >
                  <TrendingUp
                    size={20}
                    className="text-[#B8C6D5]"
                  />
                  <span className="text-xs">
                    My Portfolio
                  </span>
                </button>
              </div>
            </div>
          
<div className={`${panel} flex h-full flex-col items-center justify-center p-5 text-center sm:p-6`}>
  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#34404D] bg-[#202A35]">
    <Wallet size={23} className="text-[#B8C6D5]" />
  </div>

  <p className={label}>FUND YOUR ACCOUNT</p>

  <h2 className="mt-2 font-['Lora'] text-[25px]">
    Add Money
  </h2>

  <p className="mt-3 max-w-[240px] text-xs leading-5 text-[#8E9BAA]">
    Manage your available cash and account funding.
  </p>

  <button
    type="button"
    onClick={() => navigate("/deposit")}
    className="mt-6 rounded-xl border border-[#405064] bg-[#263546] px-6 py-3 text-xs font-semibold text-[#E5EDF5] transition hover:bg-[#34485E]"
  >
    Deposit Funds
  </button>
</div>

        </section>

        <WatchlistOverlay />

        <footer className="flex items-center justify-between border-t border-[#2B333D] pt-6 text-[11px] text-[#647384]">
          <span>RUSSELL WEALTH</span>
          <span>Investment Dashboard</span>
        </footer>
      </div>
    </main>
  );
}
