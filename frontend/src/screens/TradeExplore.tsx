import AssetLogo from "./../components/AssetLogo";
import { useEffect, useMemo, useState } from "react";
import { useTrading } from "../hooks/useTrading";

type Asset = {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  price: string;
};

type Holding = {
  symbol: string;
  quantity: string;
  market_value: string;
};

type Portfolio = {
  cash_balance: string;
  holdings: Holding[];
};

const categories = ["All", "Stocks", "ETFs", "REITs", "Bonds", "Crypto"] as const;
type Category = (typeof categories)[number];

const catalog: Asset[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "STOCK", currency: "USD", price: "" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "STOCK", currency: "USD", price: "" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "STOCK", currency: "USD", price: "" },
  { symbol: "XEQT.TO", name: "iShares Core Equity ETF", type: "ETF", currency: "CAD", price: "" },
  { symbol: "VFV.TO", name: "Vanguard S&P 500 ETF", type: "ETF", currency: "CAD", price: "" },
  { symbol: "VDY.TO", name: "Vanguard Canadian High Dividend ETF", type: "ETF", currency: "CAD", price: "" },
  { symbol: "ZRE.TO", name: "BMO Equal Weight REITs ETF", type: "REIT", currency: "CAD", price: "" },
  { symbol: "XRE.TO", name: "iShares S&P/TSX Capped REIT ETF", type: "REIT", currency: "CAD", price: "" },
  { symbol: "XBB.TO", name: "iShares Canadian Universe Bond ETF", type: "BOND", currency: "CAD", price: "" },
  { symbol: "ZAG.TO", name: "BMO Aggregate Bond ETF", type: "BOND", currency: "CAD", price: "" },
  { symbol: "BTC", name: "Bitcoin", type: "CRYPTO", currency: "USD", price: "" },
  { symbol: "ETH", name: "Ethereum", type: "CRYPTO", currency: "USD", price: "" },
];

function categoryOf(asset: Asset): Category {
  const type = asset.type.toUpperCase();
  const name = asset.name.toUpperCase();
  if (type.includes("CRYPTO")) return "Crypto";
  if (type.includes("REIT") || name.includes("REIT")) return "REITs";
  if (type.includes("BOND") || name.includes("BOND")) return "Bonds";
  if (type.includes("ETF") || name.includes(" ETF")) return "ETFs";
  return "Stocks";
}

function formatMoney(value: string | number, currency = "CAD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function TradeExplore() {
  const trade = useTrading();

  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("AAPL");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assetError, setAssetError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      try {
        const response = await fetch("/api/customer/assets", {
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Assets unavailable");
        if (active) setAssets(Array.isArray(data.assets) ? data.assets : []);
      } catch (error) {
        if (active) {
          setAssetError(error instanceof Error ? error.message : "Assets unavailable");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAssets();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      try {
        const response = await fetch("/api/customer/portfolio", {
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Portfolio unavailable");
        if (active) {
          setPortfolio(data);
          setPortfolioError("");
        }
      } catch (error) {
        if (active) {
          setPortfolioError(
            error instanceof Error ? error.message : "Portfolio unavailable"
          );
        }
      }
    }

    void loadPortfolio();
    const refresh = () => { void loadPortfolio(); };
    window.addEventListener("portfolio-updated", refresh);

    return () => {
      active = false;
      window.removeEventListener("portfolio-updated", refresh);
    };
  }, []);

  const allAssets = useMemo(() => {
    const merged = new Map<string, Asset>();

    for (const asset of catalog) merged.set(asset.symbol.toUpperCase(), asset);

    for (const asset of assets) {
      merged.set(asset.symbol.toUpperCase(), asset);
    }

    return Array.from(merged.values());
  }, [assets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allAssets.filter(asset => {
      const matchesCategory =
        category === "All" || categoryOf(asset) === category;
      const matchesSearch =
        !query ||
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [allAssets, category, search]);

  const current = allAssets.find(
    asset => asset.symbol.toUpperCase() === selected.toUpperCase()
  ) || catalog[0];

  const isBackendListed = assets.some(
    asset => asset.symbol.toUpperCase() === current.symbol.toUpperCase()
  );

  const isSupportedType = ["Stocks", "ETFs", "REITs", "Bonds"].includes(
    categoryOf(current)
  );

  const owned = portfolio?.holdings.find(
    holding => holding.symbol.toUpperCase() === current.symbol.toUpperCase()
  );

  const canSubmit =
    isBackendListed &&
    isSupportedType &&
    trade.symbol === current.symbol &&
    !trade.submitting;

  function selectAsset(symbol: string) {
    setSelected(symbol);
    trade.setSymbol(symbol);
  }

  return (
    <div className="min-h-screen bg-[#080B0F] px-4 py-6 text-[#F2F2F3] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8F9BAA]">
              Russell Wealth / Investment Marketplace
            </p>
            <h1 className="font-['Lora'] text-3xl font-semibold tracking-tight sm:text-5xl">
              Trade <span className="italic text-[#BFC8D3]">& Explore</span>
            </h1>
            <p className="mt-3 text-sm text-[#9DA8B7]">
              Discover assets, inspect your positions, and execute simulated trades.
            </p>
          </div>

          <div className="rounded-2xl border border-[#303946] bg-[#151B23] px-5 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8F9BAA]">
              Available Cash
            </p>
            <p className="mt-1 text-xl font-semibold">
              {portfolio
                ? formatMoney(portfolio.cash_balance)
                : "Unavailable"}
            </p>
          </div>
        </header>

        <div className="mb-5 rounded-2xl border border-[#303946] bg-[#111720] p-3">
          <div className="flex items-center gap-3">
            <span className="text-xl text-[#9BA8B8]">⌕</span>
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search Apple, AAPL, ETFs, bonds, crypto..."
              aria-label="Search investments"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-white outline-none placeholder:text-[#687686]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg px-3 py-2 text-xs text-[#AAB5C3] hover:bg-[#29313D]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mb-7 flex flex-wrap gap-2">
          {categories.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={
                "rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors " +
                (category === item
                  ? "border-[#CDD4DD] bg-[#D7DDE5] text-[#111720]"
                  : "border-[#303946] bg-[#151B23] text-[#AAB5C3] hover:border-[#778697] hover:text-white")
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-3xl border border-[#2D3642] bg-[#10151C] p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Explore Assets</h2>
                <p className="mt-1 text-xs text-[#8895A5]">
                  {filtered.length} investments · Select one to inspect
                </p>
              </div>
              <span className="rounded-lg bg-[#242D38] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#B5C0CE]">
                Market Explorer
              </span>
            </div>

            {assetError && (
              <p className="mb-4 rounded-xl border border-[#69513B] bg-[#2A211B] p-3 text-xs text-[#F0C89D]">
                Live asset catalog: {assetError}. Showing the sample catalog.
              </p>
            )}

            {loading && (
              <p className="mb-4 text-xs text-[#9BA8B8]">Loading market assets...</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map(asset => {
                const active = current.symbol === asset.symbol;
                const listed = assets.some(
                  item => item.symbol.toUpperCase() === asset.symbol.toUpperCase()
                );

                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => selectAsset(asset.symbol)}
                    className={
                      "flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition-all " +
                      (active
                        ? "border-[#9AABBE] bg-[#283340]"
                        : "border-[#29323D] bg-[#171D26] hover:border-[#66778B] hover:bg-[#202936]")
                    }
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#455262] bg-[#303B49] text-xs font-bold">
                      {asset.symbol.slice(0, 3)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-3"><AssetLogo symbol={asset.symbol} name={asset.name} /><div className="min-w-0"><p className="truncate text-sm font-semibold">
                        {asset.symbol}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#A2ADBA]">
                        {asset.name}
                      </p></div></div>
                      <p className="mt-2 text-[10px] text-[#8795A5]">
                        {categoryOf(asset)} · {asset.currency}
                        {!listed ? " · Preview" : ""}
                      </p>
                    </div>

                    <span className="text-[#B3BECC]">›</span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <p className="rounded-xl border border-[#29323D] p-8 text-center text-sm text-[#A2ADBA]">
                No matching investments.
              </p>
            )}
          </section>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-[#3B4654] bg-gradient-to-b from-[#222C38] to-[#10151C] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#A5B3C3]">
                Asset Overview
              </p>

              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-semibold">{current.symbol}</h2>
                  <p className="mt-2 text-sm text-[#B6C1CE]">
                    {current.name}
                  </p>
                </div>
                <span className="rounded-lg border border-[#526071] px-2 py-1 text-[10px]">
                  {categoryOf(current)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#151C25] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#8492A2]">
                    Listed Price
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {isBackendListed && current.price
                      ? formatMoney(current.price, current.currency)
                      : "Not available"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#151C25] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#8492A2]">
                    Shares Owned
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {portfolio ? (owned?.quantity ?? "0") : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#303B49] bg-[#111821] p-4">
                <p className="text-xs text-[#A5B2C2]">Position Market Value</p>
                <p className="mt-2 text-xl font-semibold">
                  {portfolio
                    ? formatMoney(owned?.market_value ?? "0")
                    : "Unavailable"}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-[#455262] p-5 text-center">
                <p className="text-xs font-semibold text-[#C0CBD8]">
                  Historical Price Chart
                </p>
                <p className="mt-2 text-xs leading-5 text-[#8795A5]">
                  Chart data isn't supplied by the current asset-list API.
                  No fabricated price history is displayed.
                </p>
              </div>

              {portfolioError && (
                <p className="mt-4 text-xs text-[#F0C89D]">
                  Portfolio: {portfolioError}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-[#303946] bg-[#141B24] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Trade Ticket</h2>
                <span className="text-[10px] uppercase tracking-wider text-[#A3B0BF]">
                  Simulated Trading
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                {(["BUY", "SELL"] as const).map(direction => (
                  <button
                    key={direction}
                    type="button"
                    onClick={() => trade.setDirection(direction)}
                    className={
                      "rounded-xl border py-3 text-sm font-semibold " +
                      (trade.direction === direction
                        ? "border-[#C9D2DC] bg-[#D9E0E8] text-[#111720]"
                        : "border-[#3C4856] bg-[#202A35] text-[#BCC7D5]")
                    }
                  >
                    {direction === "BUY" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>

              <label className="mb-2 block text-xs text-[#AAB6C5]">
                Quantity (whole shares)
              </label>
              <input
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={trade.quantity}
                onChange={event => trade.setQuantity(event.target.value)}
                className="mb-4 w-full rounded-xl border border-[#3D4A59] bg-[#0E141C] px-4 py-3 text-base text-white outline-none focus:border-[#A7B8CB]"
              />

              <div className="mb-4 flex justify-between border-b border-[#303946] pb-3 text-sm">
                <span className="text-[#A0ADBD]">Selected Asset</span>
                <span className="font-semibold">{current.symbol}</span>
              </div>

              {!isBackendListed && (
                <p className="mb-4 text-xs leading-5 text-[#D5B58F]">
                  This asset is a discovery preview. Trading becomes available
                  when it is supported by your existing asset catalog.
                </p>
              )}

              {!isSupportedType && (
                <p className="mb-4 text-xs text-[#D5B58F]">
                  Crypto trading is not enabled in this version.
                </p>
              )}

              {trade.error && (
                <p role="alert" className="mb-4 rounded-xl bg-[#3B2025] p-3 text-xs text-[#FFBEC6]">
                  {trade.error}
                </p>
              )}

              {trade.message && (
                <p role="status" className="mb-4 rounded-xl bg-[#20382E] p-3 text-xs text-[#B9E8D0]">
                  {trade.message}
                </p>
              )}

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => { void trade.submitTrade(); }}
                className="w-full rounded-xl bg-[#D7DEE7] py-3.5 text-sm font-bold text-[#10151B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {trade.submitting
                  ? "Processing..."
                  : `${trade.direction === "BUY" ? "Buy" : "Sell"} ${current.symbol}`}
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#8795A5]">
                Orders use the existing Russell Wealth trading API.
                No real securities or cryptocurrency are purchased.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
