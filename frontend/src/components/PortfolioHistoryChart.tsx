import { CustomerDemoContext } from "../demo/customerDemo";
import { useContext, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildHistorySeries, type PortfolioPoint as Point, type PortfolioRange as Range } from "../utils/portfolioHistory";

const emptyHistory: Point[] = [];
const ranges: Range[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);

export default function PortfolioHistoryChart({
  value,
  history = emptyHistory,
}: {
  value: number | null;
  history?: Point[];
}) {
  const demo = useContext(CustomerDemoContext);
  const [demoHistory] = useState<Point[]>(() => Array.from({ length: 24 }, (_, i) => ({
    time: Date.now() - (23 - i) * 3600000, value: 48500 + i * 1500 / 23,
  })));
  const [range, setRange] = useState<Range>("1D");
  const data = useMemo(() => buildHistorySeries(demo ? demoHistory : history, value, range),
    [demo, demoHistory, history, value, range]);

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
            Portfolio Balance History
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

      <div className="rw-portfolio-chart-canvas h-[280px] w-full sm:h-[330px]">
        {data.length < 2 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#34404D] bg-[#10161D] px-6 text-center">
            <p className="text-sm font-medium text-[#DCE7F3]">
              Your balance history starts when you fund your account.
            </p>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[#8E9BAA]">
              Add money to start tracking your account balance.
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
        {demo ? 'Fictional portfolio history · Demo CAD values' : 'Recorded account balances · CAD · Flat line until the balance changes · Not investment returns'}
      </p>
    </div>
  );
}
