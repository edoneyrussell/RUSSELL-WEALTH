import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import AssetLogo from "./AssetLogo";

type Quote = {
  symbol: string;
  price: number;
  currency: string;
  provider: string;
  as_of: string | number | null;
  price_type: string;
};

type HistoryPoint = {
  date: string;
  close: number;
};

type StockData = {
  quote?: Quote;
  change?: number;
  percent?: number;
  referenceDate?: string;
  error?: string;
};

const STORAGE_KEY = "russellwealth:watchlist:v1";
const DEFAULT_SYMBOLS: string[] = [];

function readSymbols(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SYMBOLS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SYMBOLS;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return DEFAULT_SYMBOLS;
  }
}

function money(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function asOf(value: string | number | null) {
  if (!value) return "Time unavailable";
  const date = typeof value === "number"
    ? new Date(value * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

function closeWatchlist() {
  window.history.pushState({}, "", "/dashboard");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function WatchlistOverlay() {
  const [open, setOpen] = useState(
    () => window.location.hash === "#watchlist"
  );
  const [symbols, setSymbols] = useState(readSymbols);
  const [input, setInput] = useState("");
  const [data, setData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => setOpen(
      window.location.pathname === "/dashboard" &&
      window.location.hash === "#watchlist"
    );
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWatchlist();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols]);

  useEffect(() => {
    if (!open || symbols.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      const entries = await Promise.all(
        symbols.map(async (symbol): Promise<[string, StockData]> => {
          try {
            const encoded = encodeURIComponent(symbol);
            const [qr, hr] = await Promise.all([
              fetch(`/api/market/quote?symbol=${encoded}`, {
                signal: controller.signal
              }),
              fetch(`/api/market/history?symbol=${encoded}`, {
                signal: controller.signal
              })
            ]);

            if (!qr.ok) throw new Error("Quote unavailable");

            const quote = await qr.json() as Quote;
            const result: StockData = { quote };

            if (hr.ok) {
              const payload = await hr.json() as {
                history?: HistoryPoint[];
              };

              const points = (payload.history ?? [])
                .filter(p => Number.isFinite(Number(p.close)) && !!p.date)
                .sort((a, b) => a.date.localeCompare(b.date));

              if (points.length >= 2) {
                const previous = Number(points[points.length - 2].close);
                const latest = Number(points[points.length - 1].close);
                const quotePrice = Number(quote.price);

                // Only use the quote for the movement calculation
                // when its date matches the latest history date.
                const latestDate = points[points.length - 1].date.slice(0, 10);
                const quoteDate = quote.as_of
                  ? (typeof quote.as_of === "number"
                      ? new Date(quote.as_of * 1000).toISOString()
                      : String(quote.as_of)).slice(0, 10)
                  : "";

                const comparison = quoteDate === latestDate &&
                  Number.isFinite(quotePrice)
                  ? quotePrice
                  : latest;

                if (previous > 0) {
                  result.change = comparison - previous;
                  result.percent = (result.change / previous) * 100;
                  result.referenceDate = latestDate;
                }
              }
            }

            return [symbol, result];
          } catch {
            return [symbol, { error: "Market data unavailable" }];
          }
        })
      );

      if (!cancelled) {
        setData(Object.fromEntries(entries));
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, symbols, refresh]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(
      () => setRefresh(v => v + 1),
      60000
    );
    return () => window.clearInterval(timer);
  }, [open]);

  async function addStock() {
    const symbol = input.trim().toUpperCase();

    if (!/^[A-Z0-9.^-]{1,20}$/.test(symbol)) {
      setMessage("Enter a valid stock symbol.");
      return;
    }

    if (symbols.includes(symbol)) {
      setMessage("This stock is already on your watchlist.");
      return;
    }

    setAdding(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/market/quote?symbol=${encodeURIComponent(symbol)}`
      );

      if (!response.ok) throw new Error();

      const quote = await response.json() as Quote;
      if (!Number.isFinite(Number(quote.price))) throw new Error();

      setSymbols(current => [...current, symbol]);
      setInput("");
      setMessage(`${symbol} added to your watchlist.`);
    } catch {
      setMessage("Unable to verify this symbol with market data.");
    } finally {
      setAdding(false);
    }
  }

  function removeStock(symbol: string) {
    setSymbols(current => current.filter(s => s !== symbol));
    setMessage(`${symbol} removed.`);
  }

  function openMarket(symbol: string) {
    window.history.pushState(
      {},
      "",
      `/markets?symbol=${encodeURIComponent(symbol)}`
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new Event("russellwealth:market-symbol-change"));
  }

  if (!open) return null;

  const gainers = symbols.filter(s =>
    typeof data[s]?.change === "number" && data[s].change! > 0
  ).length;

  const losers = symbols.filter(s =>
    typeof data[s]?.change === "number" && data[s].change! < 0
  ).length;

  return (
    <div
      className="fixed inset-0 z-[10000] h-[100dvh] overflow-x-hidden overflow-y-scroll overscroll-contain bg-[#090C10] text-[#F0F3F7] [-webkit-overflow-scrolling:touch]"
      role="dialog"
      aria-modal="true"
      aria-label="My Watchlist"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-[#8DA9C9]">
              RUSSELL WEALTH / MARKETS
            </p>
            <h1 className="font-['Lora'] text-4xl sm:text-5xl">
              My Watchlist
            </h1>
            <p className="mt-3 text-sm text-[#91A1B4]">
              Monitor the assets you're following.
            </p>
          </div>

          <button
            type="button"
            onClick={closeWatchlist}
            aria-label="Close Watchlist"
            className="rounded-xl border border-[#34404D] bg-[#171E27] p-3 hover:bg-[#26313D]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-7 grid grid-cols-3 gap-3">
          {[
            ["WATCHING", symbols.length],
            ["GAINERS", gainers],
            ["DECLINERS", losers]
          ].map(([name, value]) => (
            <div
              key={name}
              className="rounded-2xl border border-[#2B333D] bg-[#12171E] p-4 sm:p-6"
            >
              <p className="text-[10px] tracking-[0.12em] text-[#91A1B4]">
                {name}
              </p>
              <p className="mt-3 text-2xl font-semibold sm:text-3xl">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-7 rounded-2xl border border-[#2B333D] bg-[#12171E] p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-[#91A1B4]">
            ADD TO WATCHLIST
          </p>

          <form
            onSubmit={e => {
              e.preventDefault();
              void addStock();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#34404D] bg-[#090C10] px-4">
              <Search size={18} className="text-[#91A1B4]" />
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter symbol — AAPL, NVDA, SHOP.TO"
                aria-label="Stock symbol"
                className="w-full bg-transparent py-4 text-sm text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#B8C6D5] px-6 py-4 text-sm font-semibold text-[#090C10] hover:bg-[#D5DFEA] disabled:opacity-50"
            >
              <Plus size={18} />
              {adding ? "Checking..." : "Add Stock"}
            </button>
          </form>

          {message && (
            <p role="status" className="mt-3 text-xs text-[#B8C6D5]">
              {message}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#2B333D] bg-[#12171E]">
          <div className="flex items-center justify-between border-b border-[#2B333D] px-5 py-5 sm:px-6">
            <h2 className="font-['Lora'] text-xl">Watched Assets</h2>
            <button
              type="button"
              onClick={() => setRefresh(v => v + 1)}
              disabled={loading}
              className="flex items-center gap-2 text-xs text-[#B8C6D5] hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          {symbols.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-['Lora'] text-2xl">
                Your watchlist is empty
              </p>
              <p className="mt-3 text-sm text-[#91A1B4]">
                Add a stock symbol above to start monitoring it.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2B333D]">
              {symbols.map(symbol => {
                const stock = data[symbol];
                const quote = stock?.quote;
                const change = stock?.change;
                const percent = stock?.percent;
                const positive = typeof change === "number" && change > 0;
                const negative = typeof change === "number" && change < 0;
                const color = positive
                  ? "text-[#7DD9A8]"
                  : negative
                    ? "text-[#F19A9A]"
                    : "text-[#91A1B4]";

                return (
                  <div
                    key={symbol}
                    className="flex flex-wrap items-center gap-4 px-4 py-5 hover:bg-[#171E27] sm:px-6"
                  >
                    <button
                      type="button"
                      onClick={() => openMarket(symbol)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <AssetLogo symbol={symbol} name={symbol} />
                      <div className="min-w-0">
                        <p className="font-semibold">{symbol}</p>
                        <p className="mt-1 text-xs text-[#91A1B4]">
                          {quote?.provider ?? "Market data"}
                        </p>
                      </div>
                    </button>

                    <div className="min-w-[110px] text-right">
                      <p className="text-sm font-semibold">
                        {quote
                          ? money(Number(quote.price), quote.currency)
                          : loading
                            ? "Loading..."
                            : "Unavailable"}
                      </p>
                      <p className="mt-1 text-[11px] text-[#91A1B4]">
                        {quote?.currency ?? ""}
                      </p>
                    </div>

                    <div className={`min-w-[120px] text-right ${color}`}>
                      {typeof change === "number" &&
                       typeof percent === "number" ? (
                        <>
                          <div className="flex items-center justify-end gap-1 text-sm font-semibold">
                            {positive
                              ? <ArrowUpRight size={17} />
                              : negative
                                ? <ArrowDownRight size={17} />
                                : null}
                            {change > 0 ? "+" : ""}
                            {change.toFixed(2)}
                          </div>
                          <p className="mt-1 text-xs">
                            {percent > 0 ? "+" : ""}
                            {percent.toFixed(2)}%
                          </p>
                        </>
                      ) : (
                        <p className="text-xs">Change unavailable</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStock(symbol)}
                      aria-label={`Remove ${symbol} from watchlist`}
                      className="rounded-lg p-2 text-[#91A1B4] hover:bg-[#303039] hover:text-[#F19A9A]"
                    >
                      <Trash2 size={17} />
                    </button>

                    <p className="w-full text-right text-[10px] text-[#738599]">
                      {quote
                        ? `Quote: ${asOf(quote.as_of)} · ${quote.price_type.replaceAll("_", " ")}`
                        : stock?.error ?? ""}
                      {stock?.referenceDate
                        ? ` · Comparison date: ${stock.referenceDate}`
                        : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-5 text-xs text-[#738599]">
          Market data may be delayed. Daily changes use available historical
          closing prices and may not reflect the current trading session.
          Watchlist selections are saved in this browser.
        </p>
      </div>
    </div>
  );
}
