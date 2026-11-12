import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { time: number; value: number };
type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const KEY = "russellwealth:portfolio-history:v1";
const ranges: Range[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);

function readHistory(): Point[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(stored)) return [];

    return stored.filter(
      (point): point is Point =>
        typeof point?.time === "number" &&
        typeof point?.value === "number" &&
        Number.isFinite(point.value)
    );
  } catch {
    return [];
  }
}

export default function PortfolioHistoryChart({
  value,
}: {
  value: number | null;
}) {
  const [history, setHistory] = useState<Point[]>(readHistory);
  const [range, setRange] = useState<Range>("1M");

  useEffect(() => {
    if (value === null || !Number.isFinite(value)) return;

    setHistory(previous => {
      const now = Date.now();
      const last = previous[previous.length - 1];

      if (
        last &&
        last.value === value &&
        now - last.time < 60 * 60 * 1000
      ) {
        return previous;
      }

      const next = [...previous, { time: now, value }]
        .filter(point => point.time >= now - 366 * 86400000)
        .slice(-10000);

      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Continue displaying the chart without persistent storage.
      }

      return next;
    });
  }, [value]);

  const data = useMemo(() => {
    const days: Record<Range, number> = {
      "1D": 1,
      "1W": 7,
      "1M": 30,
      "3M": 90,
      "1Y": 365,
      ALL: Infinity,
    };

    const cutoff = Date.now() - days[range] * 86400000;
    return history.filter(point => point.time >= cutoff);
  }, [history, range]);

  const first = data[0]?.value;
  const last = data[data.length - 1]?.value;
  const change =
    first !== undefined && last !== undefined ? last - first : null;

  const percent =
    change !== null && first !== undefined && first !== 0
      ? (change / first) * 100
      : null;

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E9BAA]">
            Portfolio Performance
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm font-medium text-[#DCE7F3]">
              {change === null
                ? "Building your history"
                : `${change >= 0 ? "+" : "−"}${formatMoney(Math.abs(change))}`}
            </span>

            {percent !== null && (
              <span className="text-xs text-[#9CB1C6]">
                {percent >= 0 ? "+" : ""}
                {percent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-[#34404D] bg-[#171E27] p-1">
          {ranges.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-lg px-3 py-2 text-xs transition ${
                range === item
                  ? "bg-[#34475C] text-white"
                  : "text-[#8E9BAA] hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] w-full sm:h-[330px]">
        {data.length < 2 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#34404D] bg-[#10161D] px-6 text-center">
            <p className="text-sm font-medium text-[#DCE7F3]">
              Your portfolio history starts here.
            </p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[#8E9BAA]">
              Russell Wealth is now recording portfolio value snapshots.
              The line will appear as new observations become available.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="rwPortfolioGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#93B5D8"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="#93B5D8"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="#2B333D"
                strokeDasharray="3 7"
              />

              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(time: number) =>
                  new Date(time).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8190A0", fontSize: 10 }}
                minTickGap={35}
              />

              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(number: number) =>
                  number >= 1000
                    ? `${(number / 1000).toFixed(1)}k`
                    : String(Math.round(number))
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#8190A0", fontSize: 10 }}
                width={48}
              />

              <Tooltip
                contentStyle={{
                  background: "#171E27",
                  border: "1px solid #34404D",
                  borderRadius: 12,
                  color: "#F0F3F7",
                }}
                labelFormatter={label =>
                  new Date(Number(label)).toLocaleString("en-CA")
                }
                formatter={number => [
                  formatMoney(Number(number)),
                  "Portfolio Value",
                ]}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="#A6C3E1"
                strokeWidth={2.5}
                fill="url(#rwPortfolioGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#D6E6F7",
                  stroke: "#526B87",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-3 text-[10px] text-[#667585]">
        Actual recorded account values · CAD · Not investment returns
      </p>
    </div>
  );
}
