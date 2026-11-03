import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, TrendingUp } from 'lucide-react'

type Instrument = {
  symbol: string
  name: string
  exchange: string
  currency: string
}

type Props = {
  value: string
  onChange: (value: string) => void
}

export default function TradeSymbolSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Instrument[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 300,
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  function updatePosition() {
    const rect = inputRef.current?.getBoundingClientRect()
    if (!rect) return

    setPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return

    updatePosition()

    const reposition = () => updatePosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
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
          `/api/market/search?q=${encodeURIComponent(query.trim())}`,
          {
            credentials: 'same-origin',
            signal: controller.signal,
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Market search unavailable')
        }

        const instruments: Instrument[] = (data.results || []).map(
          (item: any) => ({
            symbol: item.symbol,
            name: item.name || item.symbol,
            exchange: item.exchange || 'Exchange unavailable',
            currency: item.currency || '',
          })
        )

        instruments.sort((a, b) => {
          const aExact =
            a.symbol.toUpperCase() === query.trim().toUpperCase()
          const bExact =
            b.symbol.toUpperCase() === query.trim().toUpperCase()

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
  }, [query, open])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node

      if (
        !inputRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function handleChange(next: string) {
    setQuery(next)
    onChange(next)
    setOpen(true)
    updatePosition()
  }

  function selectInstrument(item: Instrument) {
    setQuery(item.symbol)
    onChange(item.symbol)
    setOpen(false)
    setResults([])
  }

  const dropdown =
    open && query.trim().length >= 2
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[10000] overflow-hidden rounded-xl border border-[#30343b] bg-[#14171c] shadow-2xl"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            <div className="flex items-center justify-between border-b border-[#30343b] px-3 py-2">
              <span className="text-[9px] font-semibold tracking-[0.15em] text-[#8c929c]">
                MATCHING INSTRUMENTS
              </span>
              <span className="text-[10px] text-[#777e88]">
                {loading ? 'Searching...' : `${results.length} found`}
              </span>
            </div>

            <div className="max-h-[260px] overflow-y-auto p-1">
              {loading && (
                <div className="px-3 py-5 text-center text-xs text-[#8c929c]">
                  Searching global markets...
                </div>
              )}

              {!loading && error && (
                <div className="px-3 py-5 text-center text-xs text-red-400">
                  {error}
                </div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className="px-3 py-5 text-center text-xs text-[#8c929c]">
                  No matching companies found.
                </div>
              )}

              {!loading &&
                !error &&
                results.map(item => (
                  <button
                    key={`${item.symbol}-${item.exchange}`}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectInstrument(item)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left transition hover:bg-[#22262d]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#30343b] bg-[#1b1f25]">
                      <TrendingUp size={15} className="text-[#c5cad2]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[#f5f5f5]">
                        {item.symbol}
                      </p>
                      <p className="truncate text-[10px] text-[#8c929c]">
                        {item.name}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-[#c5cad2]">
                        {item.exchange}
                      </p>
                      <p className="text-[9px] text-[#777e88]">
                        {item.currency}
                      </p>
                    </div>

                    <ArrowUpRight
                      size={13}
                      className="shrink-0 text-[#777e88]"
                    />
                  </button>
                ))}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <input
        ref={inputRef}
        aria-label="Search company or ticker"
        aria-autocomplete="list"
        value={query}
        onFocus={() => {
          setOpen(true)
          updatePosition()
        }}
        onChange={event => handleChange(event.target.value)}
        placeholder="VDY, XEG, RY, SHOP"
        autoComplete="off"
        className="w-full min-w-0 bg-transparent outline-none text-[#f5f5f5] text-[12px]"
      />

      {dropdown}
    </>
  )
}
