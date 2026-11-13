import { useCustomerFetch } from "../demo/customerDemo";
import AssetLogo from "./../components/AssetLogo";
import { useEffect, useMemo, useState } from "react";
import { useTrading } from "../hooks/useTrading";
import { Star } from "lucide-react";
import {
  getWatchlist,
  toggleWatchlist
} from "../utils/watchlist";

type Asset = {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  price: string;
  exchange?: string;
  listing_currency?: string;
  price_source?: string;
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

const featuredSymbols = ["AAPL", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "COST", "WMT", "JPM", "V", "MA", "NFLX", "DIS", "SHOP", "UBER", "COIN", "PLTR", "KO", "PEP", "NKE", "MCD"];
const catalog: Asset[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "STOCK", currency: "USD", price: "100.00" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "STOCK", currency: "USD", price: "100.00" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "STOCK", currency: "USD", price: "100.00" },
  { symbol: "XEQT.TO", name: "iShares Core Equity ETF", type: "ETF", currency: "CAD", price: "100.00" },
  { symbol: "VFV.TO", name: "Vanguard S&P 500 ETF", type: "ETF", currency: "CAD", price: "100.00" },
  { symbol: "VDY.TO", name: "Vanguard Canadian High Dividend ETF", type: "ETF", currency: "CAD", price: "100.00" },
  { symbol: "ZRE.TO", name: "BMO Equal Weight REITs ETF", type: "REIT", currency: "CAD", price: "100.00" },
  { symbol: "XRE.TO", name: "iShares S&P/TSX Capped REIT ETF", type: "REIT", currency: "CAD", price: "100.00" },
  { symbol: "XBB.TO", name: "iShares Canadian Universe Bond ETF", type: "BOND", currency: "CAD", price: "100.00" },
  { symbol: "ZAG.TO", name: "BMO Aggregate Bond ETF", type: "BOND", currency: "CAD", price: "100.00" },
  { symbol: "BTC", name: "Bitcoin", type: "CRYPTO", currency: "USD", price: "100.00" },
  { symbol: "ETH", name: "Ethereum", type: "CRYPTO", currency: "USD", price: "100.00" },
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
  const customerFetch = useCustomerFetch();
  const trade = useTrading();

  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(48);
  const [marketResults, setMarketResults] = useState<Asset[]>([]);
  const [marketSearching, setMarketSearching] = useState(false);
  const [selected, setSelected] = useState(() =>
    new URLSearchParams(window.location.search).get("symbol")?.toUpperCase() || "AAPL"
  );
  const [starred, setStarred] = useState<string[]>(getWatchlist);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assetError, setAssetError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAssets() {
      try {
        const response = await customerFetch("/api/customer/assets", {
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
        const response = await customerFetch("/api/customer/portfolio", {
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

  useEffect(() => {
    const query = search.trim();

    if (query.length < 1 || assets.some(asset => asset.symbol.toLowerCase().includes(query.toLowerCase()) || asset.name.toLowerCase().includes(query.toLowerCase()))) {
      setMarketResults([]);
      setMarketSearching(false);
      return;
    }

    const controller = new AbortController();

    setMarketSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await customerFetch(
          `/api/market/search?q=${encodeURIComponent(query)}`,
          {
            credentials: "same-origin",
            signal: controller.signal,
          }
        );

        if (!response.ok) throw new Error("Market search unavailable");

        const data = await response.json();

        const results: Asset[] = (data.results || []).map(
          (item: {
            symbol: string;
            name?: string;
            currency?: string;
            type?: string;
          }) => ({
            symbol: item.symbol,
            name: item.name || item.symbol,
            type: item.type || (
              /ETF|exchange.traded fund/i.test(item.name || "")
                ? "ETF"
                : "STOCK"
            ),
            currency: 'CAD',
            listing_currency: item.currency || (item.symbol.endsWith('.TO') ? 'CAD' : 'USD'),
            price: "100.00",
          })
        );

        setMarketResults(results);
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setMarketResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setMarketSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, assets]);

  useEffect(() => { setVisibleCount(48); }, [search, category]);
  useEffect(() => { trade.setSymbol(selected); }, [selected]);

  useEffect(() => {
    const syncWatchlist = () => setStarred(getWatchlist());
    window.addEventListener("russellwealth:watchlist-updated", syncWatchlist);
    window.addEventListener("storage", syncWatchlist);
    return () => {
      window.removeEventListener("russellwealth:watchlist-updated", syncWatchlist);
      window.removeEventListener("storage", syncWatchlist);
    };
  }, []);

  useEffect(() => {
    const syncSymbol = () => {
      const symbol = new URLSearchParams(window.location.search)
        .get("symbol")?.trim().toUpperCase();

      if (symbol && /^[A-Z0-9.^-]{1,20}$/.test(symbol)) {
        setSelected(symbol);
        trade.setSymbol(symbol);
        setSearch(symbol);
        setCategory("All");
      }
    };

    syncSymbol();
    window.addEventListener("popstate", syncSymbol);
    window.addEventListener(
      "russellwealth:market-symbol-change",
      syncSymbol
    );

    return () => {
      window.removeEventListener("popstate", syncSymbol);
      window.removeEventListener(
        "russellwealth:market-symbol-change",
        syncSymbol
      );
    };
  }, []);

  const allAssets = useMemo(() => {
    const merged = new Map<string, Asset>();

    for (const asset of catalog) {
      merged.set(asset.symbol.toUpperCase(), { ...asset, listing_currency: asset.currency, currency: 'CAD' });
    }

    for (const asset of assets) {
      merged.set(asset.symbol.toUpperCase(), asset);
    }

    for (const asset of marketResults) {
      merged.set(asset.symbol.toUpperCase(), asset);
    }

    return Array.from(merged.values()).sort((a, b) => {
      const left = featuredSymbols.indexOf(a.symbol), right = featuredSymbols.indexOf(b.symbol);
      return (left < 0 ? 1000 : left) - (right < 0 ? 1000 : right) || a.symbol.localeCompare(b.symbol);
    });
  }, [assets, marketResults, search]);

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
  ) || (
    selected !== "AAPL"
      ? {
          symbol: selected,
          name: selected,
          type: "STOCK",
          currency: 'CAD',
          price: "100.00"
        }
      : catalog[0]
  );

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
    isSupportedType &&
    (trade.direction === "BUY" || Number(owned?.quantity ?? 0) > 0) &&
    trade.symbol === current.symbol &&
    !trade.submitting;

  function selectAsset(symbol: string) {
    setSelected(symbol);
    trade.setSymbol(symbol);
  }

  return (
    <div className="rw-fintech-workspace rw-fintech-trade min-h-screen w-full min-w-0 overflow-x-hidden bg-[#080B0F] px-3 py-4 text-[#F2F2F3] sm:px-7 sm:py-6 lg:px-10">
      <div className="mx-auto w-full min-w-0 max-w-[1500px]">
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

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-3xl border border-[#2D3642] bg-[#10151C] p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Explore Assets</h2>
                <p className="mt-1 text-xs text-[#8895A5]">
                  {marketSearching ? "Searching markets..." : `${filtered.length.toLocaleString()} investments · Select one to inspect`}
                </p>
              </div>
              <span className="rounded-lg bg-[#242D38] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#B5C0CE]">
                Market Explorer
              </span>
            </div>

            {assetError && (
              <p className="mb-4 rounded-xl border border-[#69513B] bg-[#2A211B] p-3 text-xs text-[#F0C89D]">
                Full catalog unavailable: {assetError}. Showing featured investments.
              </p>
            )}

            {loading && (
              <p className="mb-4 text-xs text-[#9BA8B8]">Loading market assets...</p>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.slice(0, visibleCount).map(asset => {
                const active = current.symbol === asset.symbol;
                const listed = assets.some(
                  item => item.symbol.toUpperCase() === asset.symbol.toUpperCase()
                );

                return (
                  <div
                    key={asset.symbol}
                    className="relative min-w-0"
                  >
                  <button
                    type="button"
                    onClick={() => selectAsset(asset.symbol)}
                    className={
                      "flex w-full min-w-0 items-center gap-3 rounded-2xl border p-4 pr-14 text-left transition-all " +
                      (active
                        ? "border-[#9AABBE] bg-[#283340]"
                        : "border-[#29323D] bg-[#171D26] hover:border-[#66778B] hover:bg-[#202936]")
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-3"><AssetLogo symbol={asset.symbol} name={asset.name} /><div className="min-w-0"><p className="truncate text-sm font-semibold">
                        {asset.symbol}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#A2ADBA]">
                        {asset.name}
                      </p></div></div>
                      <p className="mt-3 text-sm font-semibold text-[#E0E8F1]">{formatMoney(asset.price, asset.currency)}<span className="ml-2 text-[10px] font-normal text-[#8795A5]">Simulated price</span></p>
                      <p className="mt-2 text-[10px] text-[#8795A5]">
                        {categoryOf(asset)} · {asset.exchange || asset.currency}
                        {!listed ? " · Preview" : " · Simulated"}
                      </p>
                    </div>

                    <span className="text-[#B3BECC]">›</span>
                  </button>
                  <button
                    type="button"
                    aria-label={
                      starred.includes(asset.symbol.toUpperCase())
                        ? `Remove ${asset.symbol} from watchlist`
                        : `Add ${asset.symbol} to watchlist`
                    }
                    aria-pressed={starred.includes(asset.symbol.toUpperCase())}
                    onClick={() => {
                      const next = toggleWatchlist(asset.symbol);
                      setStarred(next);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-[#455262] bg-[#222C38] p-2 text-[#D8E0EA] hover:bg-[#344356]"
                  >
                    <Star
                      size={19}
                      fill={
                        starred.includes(asset.symbol.toUpperCase())
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                  </div>
                );
              })}
            </div>

            {visibleCount < filtered.length && <div className="mt-5 text-center"><p className="mb-3 text-xs text-[#8895A5]">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length.toLocaleString()} investments</p><button type="button" className="rounded-xl border border-[#526071] px-5 py-3 text-sm text-[#D7DEE7] hover:bg-[#202936]" onClick={() => setVisibleCount(count => count + 48)}>Show more investments</button></div>}

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
                    Simulation Price
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatMoney(current.price, current.currency)}
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
                  New assets start at a simulated price of CA$100 per share.
                  Selling requires an existing position.
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
                className="rw-fintech-primary w-full rounded-xl bg-[#D7DEE7] py-3.5 text-sm font-bold text-[#10151B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {trade.submitting
                  ? "Processing..."
                  : `${trade.direction === "BUY" ? "Buy" : "Sell"} ${current.symbol}`}
              </button>

              <p className="mt-4 text-center text-[11px] leading-5 text-[#8795A5]">
                Prices and trades are simulated in CAD. New stocks start at CA$100 per share; existing stored prices are retained. No real securities are purchased.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
