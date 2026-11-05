import { useEffect, useRef, useState } from 'react';

type Stock = {
  symbol: string;
  name: string;
  exchange?: string;
};

type Holding = Stock & {
  quantity: string;
};

type Props = {
  direction: 'BUY' | 'SELL';
  symbol: string;
  onChange: (symbol: string) => void;
  holdings: Holding[];
};

export default function TradeSymbolPicker({
  direction,
  symbol,
  onChange,
  holdings,
}: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setOpen(false);
    setSelected(false);
    setResults([]);
    setError('');
    onChange('');
  }, [direction]);

  useEffect(() => {
    if (direction !== 'BUY' || !open || selected || symbol.trim().length < 2) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/market/search?q=${encodeURIComponent(symbol.trim())}`,
          {
            credentials: 'same-origin',
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search unavailable');
        }

        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [symbol, direction, open, selected]);

  const filteredHoldings = holdings.filter(
    (holding) =>
      Number(holding.quantity) > 0 &&
      (holding.symbol.toLowerCase().includes(symbol.toLowerCase()) ||
        holding.name.toLowerCase().includes(symbol.toLowerCase()))
  );

  const options = direction === 'SELL' ? filteredHoldings : results;

  const choose = (stock: Stock) => {
    onChange(stock.symbol);
    setSelected(true);
    setOpen(false);
  };

  return (
    <div ref={container} className="relative w-full">
      <div className="bg-[#101216] border border-[#30343b] flex gap-[8px] h-[36px] items-center px-[12px] rounded-[6px] w-full">
        <input
          aria-label="Symbol"
          autoComplete="off"
          value={symbol}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value.toUpperCase());
            setSelected(false);
            setOpen(true);
          }}
          placeholder={
            direction === 'BUY'
              ? 'Search stocks or ETFs'
              : 'Select from your holdings'
          }
          className="bg-transparent outline-none w-full min-w-0 text-[#f5f5f5] text-[12px]"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#14171c] border border-[#30343b] rounded-[8px] shadow-xl max-h-[230px] overflow-y-auto">
          {direction === 'BUY' && symbol.trim().length < 2 ? (
            <p className="p-3 text-[#b4b8c0] text-[12px]">
              Type at least 2 characters to search
            </p>
          ) : loading ? (
            <p className="p-3 text-[#b4b8c0] text-[12px]">
              Searching...
            </p>
          ) : error ? (
            <p className="p-3 text-red-400 text-[12px]">{error}</p>
          ) : options.length === 0 ? (
            <p className="p-3 text-[#b4b8c0] text-[12px]">
              {direction === 'SELL'
                ? 'No matching holdings'
                : 'No matching stocks'}
            </p>
          ) : (
            options.map((stock) => (
              <button
                type="button"
                key={stock.symbol}
                onClick={() => choose(stock)}
                className="w-full text-left px-3 py-2 hover:bg-[#252a31] border-b border-[#30343b] last:border-b-0"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-[#f5f5f5] text-[12px] font-semibold">
                    {stock.symbol}
                  </span>
                  <span className="text-[#b4b8c0] text-[10px]">
                    {direction === 'SELL'
                      ? `${(stock as Holding).quantity} shares`
                      : stock.exchange || ''}
                  </span>
                </div>
                <p className="text-[#b4b8c0] text-[11px] truncate">
                  {stock.name}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
