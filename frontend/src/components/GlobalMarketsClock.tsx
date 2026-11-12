import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

const markets = [
  { code: "TSX", city: "Toronto", zone: "America/Toronto" },
  { code: "NASDAQ", city: "New York", zone: "America/New_York" },
  { code: "NYSE", city: "New York", zone: "America/New_York" },
  { code: "LSE", city: "London", zone: "Europe/London" },
  { code: "TSE", city: "Tokyo", zone: "Asia/Tokyo" },
  { code: "HKEX", city: "Hong Kong", zone: "Asia/Hong_Kong" },
  { code: "ASX", city: "Sydney", zone: "Australia/Sydney" },
];

export default function GlobalMarketsClock() {
  const [selected, setSelected] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const market = markets[selected];

  const time = new Intl.DateTimeFormat("en-CA", {
    timeZone: market.zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: market.zone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  const move = (direction: number) => {
    setSelected(current =>
      (current + direction + markets.length) % markets.length
    );
  };

  return (
    <div className="w-full rounded-xl border border-[#34404D] bg-[#171E27] px-3 py-2.5 text-[#C4CED9]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 size={14} className="shrink-0 text-[#91A9BA]" />
          <select
            aria-label="Select market exchange"
            value={selected}
            onChange={e => setSelected(Number(e.target.value))}
            className="min-w-0 max-w-[105px] cursor-pointer bg-transparent text-xs font-semibold text-[#E7EDF4] outline-none"
          >
            {markets.map((item, index) => (
              <option key={item.code} value={index} className="bg-[#171E27]">
                {item.code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous market"
            onClick={() => move(-1)}
            className="rounded-md p-1 hover:bg-[#293440]"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Next market"
            onClick={() => move(1)}
            className="rounded-md p-1 hover:bg-[#293440]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="whitespace-nowrap font-mono text-[17px] font-semibold tabular-nums text-white">
          {time}
        </span>
        <span className="pb-0.5 text-right text-[10px] text-[#91A0B0]">
          {date}
        </span>
      </div>

      <div className="mt-1 text-[10px] text-[#91A0B0]">
        {market.city} local time
      </div>
    </div>
  );
}
