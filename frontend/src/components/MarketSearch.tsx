import { useEffect, useRef, useState } from 'react'
import { Search, X, ArrowUpRight, TrendingUp } from 'lucide-react'

type Stock = {
  symbol: string
  name: string
  exchange: string
  currency: string
  type: 'Stock' | 'ETF'
}

type SearchFilter = 'All' | 'Stocks' | 'ETFs'

export default function MarketSearch({
  triggerOnly = false,
}: {
  triggerOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('All')
  const [results, setResults] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }

      if (event.key === 'Escape') setOpen(false)
    }

    const openSearch = () => setOpen(true)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('russellwealth:open-market-search', openSearch)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('russellwealth:open-market-search', openSearch)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Search the Flask market API as the user types.
  useEffect(() => {
    const searchTerm = query.trim()

    if (searchTerm.length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()

    setLoading(true)
    setError('')

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/market/search?q=${encodeURIComponent(searchTerm)}`,
          {
            credentials: 'same-origin',
            signal: controller.signal,
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Market search unavailable')
        }

        const instruments: Stock[] = (data.results || []).map(
          (item: {
            symbol: string
            name: string
            exchange?: string
            currency?: string
          }) => {
            const name = item.name || item.symbol

            const isETF =
              /ETF|exchange.traded|index fund|yieldmax|income fund/i.test(name)

            return {
              symbol: item.symbol,
              name,
              exchange: item.exchange || 'Exchange unavailable',
              currency: item.currency || '',
              type: isETF ? 'ETF' : 'Stock',
            }
          }
        )

        // Put exact ticker matches before broader matches.
        instruments.sort((a, b) => {
          const aExact = a.symbol.toLowerCase() === searchTerm.toLowerCase()
          const bExact = b.symbol.toLowerCase() === searchTerm.toLowerCase()

          return Number(bExact) - Number(aExact)
        })

        setResults(instruments)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return

        setResults([])
        setError(
          err instanceof Error ? err.message : 'Unable to search markets'
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const filteredResults = results.filter(stock => {
    if (filter === 'Stocks') return stock.type === 'Stock'
    if (filter === 'ETFs') return stock.type === 'ETF'
    return true
  })

  function selectStock(symbol: string) {
    setOpen(false)
    window.location.href =
      '/markets?symbol=' + encodeURIComponent(symbol)
  }

  return (
    <>
      {!triggerOnly && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-[#969BA4] transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <Search size={17} />
          <span className="flex-1">Search stocks, ETFs, companies...</span>
          <span className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#777D87]">
            ⌘ K
          </span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/75 px-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search markets"
            className="w-full max-w-[660px] overflow-hidden rounded-2xl border border-white/15 bg-[#111317] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
              <Search size={21} className="text-[#B9BEC6]" />

              <input
                ref={inputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search company name or ticker..."
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#727883]"
              />

              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                  setFilter('All')
                }}
                className="rounded-md border border-white/10 p-2 text-[#8E949D] hover:text-white"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              {(['All', 'Stocks', 'ETFs'] as const).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={
                    'rounded-lg px-4 py-2 text-xs font-medium transition ' +
                    (filter === item
                      ? 'bg-[#D6D9DE] text-[#111317]'
                      : 'bg-white/[0.04] text-[#969BA4] hover:bg-white/10')
                  }
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <span className="text-[10px] font-semibold tracking-[0.18em] text-[#777E88]">
                {query ? 'SEARCH RESULTS' : 'MARKET DISCOVERY'}
              </span>

              <span className="text-xs text-[#777E88]">
                {loading ? 'Searching...' : `${filteredResults.length} results`}
              </span>
            </div>

            <div className="max-h-[420px] min-h-[150px] overflow-y-auto px-3 pb-4">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <p className="text-xs text-[#858C96]">
                    Searching global markets...
                  </p>
                </div>
              ) : error ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                  <p className="mt-2 text-xs text-[#777E88]">
                    Check your connection and try again.
                  </p>
                </div>
              ) : !query.trim() || query.trim().length < 2 ? (
                <div className="px-4 py-12 text-center">
                  <Search size={24} className="mx-auto mb-3 text-[#777E88]" />
                  <p className="text-sm text-white">Discover the markets</p>
                  <p className="mt-2 text-xs text-[#777E88]">
                    Search by company name or ticker symbol.
                  </p>
                </div>
              ) : filteredResults.length ? (
                filteredResults.map(stock => (
                  <button
                    key={`${stock.symbol}-${stock.exchange}`}
                    type="button"
                    onClick={() => selectStock(stock.symbol)}
                    className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#22262D]">
                      <TrendingUp
                        size={18}
                        className="text-[#D4D8DE]"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#F2F3F5]">
                        {stock.symbol}
                      </div>
                      <div className="truncate text-xs text-[#858C96]">
                        {stock.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[#C6CAD1]">
                        {stock.exchange}
                      </div>
                      <div className="mt-1 text-[11px] text-[#777E88]">
                        {stock.type}
                        {stock.currency ? ` · ${stock.currency}` : ''}
                      </div>
                    </div>

                    <ArrowUpRight
                      size={16}
                      className="text-[#777E88] transition group-hover:text-white"
                    />
                  </button>
                ))
              ) : (
                <div className="px-4 py-12 text-center">
                  <Search size={24} className="mx-auto mb-3 text-[#777E88]" />
                  <p className="text-sm text-white">
                    No matching instruments
                  </p>
                  <p className="mt-2 text-xs text-[#777E88]">
                    Try another ticker or company name.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <span className="text-[10px] tracking-[0.14em] text-[#777E88]">
                RUSSELL WEALTH / MARKET DISCOVERY
              </span>
              <span className="text-[11px] text-[#777E88]">
                ESC to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
