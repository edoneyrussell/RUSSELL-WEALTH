import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type PortfolioHistoryPoint = {
  date: string;
  value: number;
};

type Props = {
  data: PortfolioHistoryPoint[];
  currency?: string;
};

export default function PortfolioPerformanceChart({
  data,
  currency = 'CAD',
}: Props) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  if (data.length < 2) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#30343b] text-center">
        <span className="text-[#f5f5f5] text-sm font-medium">
          Portfolio performance
        </span>
        <span className="text-[#8c929c] text-xs">
          Historical snapshots are needed to display a performance trend.
        </span>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="rwPortfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39e58c" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#39e58c" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="#30343b"
            strokeDasharray="3 6"
          />

          <XAxis
            dataKey="date"
            stroke="#8c929c"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            stroke="#8c929c"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={70}
            tickFormatter={value => `$${Number(value).toLocaleString()}`}
            domain={['auto', 'auto']}
          />

          <Tooltip
            formatter={value => formatMoney(Number(value))}
            contentStyle={{
              background: '#14171c',
              border: '1px solid #30343b',
              borderRadius: 10,
              color: '#f5f5f5',
            }}
            labelStyle={{ color: '#b4b8c0' }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#39e58c"
            strokeWidth={2.5}
            fill="url(#rwPortfolioGradient)"
            isAnimationActive
            animationDuration={850}
            activeDot={{
              r: 5,
              fill: '#39e58c',
              stroke: '#080a0d',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
