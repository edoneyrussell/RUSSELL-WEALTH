import { useEffect, useState } from 'react';

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

export default function Markets() {
  useEffect(() => {
    const syncSymbol = () => {
      const selected = new URLSearchParams(window.location.search)
        .get('symbol')?.trim().toUpperCase()

      if (selected) setSymbol(selected)
    }

    window.addEventListener('popstate', syncSymbol)
    window.addEventListener('russellwealth:market-symbol-change', syncSymbol)

    return () => {
      window.removeEventListener('popstate', syncSymbol)
      window.removeEventListener('russellwealth:market-symbol-change', syncSymbol)
    }
  }, [])

  const [input, setInput] = useState('AAPL');
  const [symbol, setSymbol] = useState(() => (new URLSearchParams(window.location.search).get('symbol') || 'AAPL').trim().toUpperCase());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      setQuote(null);
      setHistory([]);

      try {
        const encoded = encodeURIComponent(symbol);

        const [quoteResponse, historyResponse] = await Promise.all([
          fetch(`/api/market/quote?symbol=${encoded}`),
          fetch(`/api/market/history?symbol=${encoded}`)
        ]);

        if (!quoteResponse.ok) {
          throw new Error('Market quote unavailable for this symbol');
        }

        const quoteData = await quoteResponse.json();
        if (active) setQuote(quoteData);

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          if (active) {
            setHistory(
              [...(historyData.history ?? [])]
                .filter((p: HistoryPoint) =>
                  Number.isFinite(Number(p.close))
                )
                .sort((a: HistoryPoint, b: HistoryPoint) =>
                  a.date.localeCompare(b.date)
                )
            );
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Unable to load market data'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [symbol]);

  const width = 900;
  const height = 260;
  const points = history.slice(-120);
  const prices = points.map(p => Number(p.close));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const chartPath = points.map((point, i) => {
    const x = points.length === 1
      ? width / 2
      : (i / (points.length - 1)) * width;
    const y = height - ((Number(point.close) - min) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  return (
    <main className="min-h-screen bg-[#08090b] text-white p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-white">
          ← Dashboard
        </a>

        <h1 className="mt-8 text-3xl font-semibold">Markets</h1>
        <p className="mt-2 text-gray-400">
          Explore market prices and historical charts.
        </p>

        <form
          className="mt-8 flex flex-wrap gap-3"
          onSubmit={e => {
            e.preventDefault();
            const next = input.trim().toUpperCase();
            if (next) setSymbol(next);
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="AAPL, RY.TO, VDY.TO..."
            className="w-72 max-w-full rounded-lg border border-gray-700 bg-[#14161a] px-4 py-3 text-white outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#d1d5db] px-6 py-3 font-semibold text-black hover:bg-white"
          >
            Search
          </button>
        </form>

        {loading && <p className="mt-8 text-gray-400">Loading market data...</p>}
        {error && <p className="mt-8 text-red-400">{error}</p>}

        {quote && !loading && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-[#101216] p-6">
            <p className="text-gray-400">{quote.symbol}</p>
            <h2 className="mt-2 text-4xl font-semibold">
              {Number(quote.price).toLocaleString('en-CA', {
                style: 'currency',
                currency: quote.currency
              })}
            </h2>
            <p className="mt-3 text-sm text-gray-400">
              Source: {quote.provider} · {quote.price_type.replaceAll('_', ' ')}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              As of: {typeof quote.as_of === 'number'
                ? new Date(quote.as_of * 1000).toLocaleString()
                : quote.as_of || 'Not provided'}
            </p>

            <div className="mt-8">
              <h3 className="mb-5 text-lg font-medium">Price history</h3>
              {points.length > 1 ? (
                <>
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full overflow-visible"
                    role="img"
                    aria-label={`${symbol} historical price chart`}
                  >
                    <path
                      d={chartPath}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-4 flex justify-between text-xs text-gray-500">
                    <span>{points[0].date}</span>
                    <span>{points[points.length - 1].date}</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-400">Historical chart unavailable.</p>
              )}
            </div>
          </section>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Market data may be delayed or historical. Russell Wealth uses simulated funds.
        </p>
      </div>
    </main>
  );
}
