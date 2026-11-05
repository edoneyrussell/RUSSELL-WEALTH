import { useEffect, useState } from 'react';

export type TrendBucket = {
  hour: string;
  total: number;
  failed: number;
  successful: number;
};

type Props = {
  trends?: TrendBucket[];
};

export default function LiveThreatTrends({ trends = [] }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const currentHour = Math.floor(now / 3600000) * 3600000;

  const buckets = Array.from({ length: 24 }, (_, index) => {
    const timestamp = currentHour - (23 - index) * 3600000;
    const key = new Date(timestamp).toISOString().slice(0, 13);
    const record = trends.find(item => item.hour?.slice(0, 13) === key);

    return {
      timestamp,
      total: Number(record?.total ?? 0),
      failed: Number(record?.failed ?? 0),
      successful: Number(record?.successful ?? 0)
    };
  });

  const maxValue = Math.max(1, ...buckets.map(b => b.total));
  const width = 600;
  const height = 140;
  const left = 35;
  const right = 10;
  const top = 10;
  const bottom = 24;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const x = (i: number) => left + (i / 23) * plotWidth;
  const y = (v: number) => top + plotHeight * (1 - v / maxValue);

  const line = (field: 'total' | 'failed' | 'successful') =>
    buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(b[field])}`).join(' ');

  const totals = buckets.reduce(
    (acc, b) => ({
      total: acc.total + b.total,
      failed: acc.failed + b.failed,
      successful: acc.successful + b.successful
    }),
    { total: 0, failed: 0, successful: 0 }
  );

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[#f5f5f5] text-[20px] font-semibold">
            Threat Trends
          </h3>
          <p className="text-[#b4b8c0] text-[12px]">
            Recorded security events · Last 24 hours (Regina CST)
          </p>
        </div>
        <span className="text-[#8c929c] text-[11px] whitespace-nowrap">
          Live · 5s
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px]">
        <span className="text-[#b4b8c0]">
          <span className="text-[#9285f5]">●</span> All events: {totals.total}
        </span>
        <span className="text-[#b4b8c0]">
          <span className="text-[#f5b942]">●</span> Failed: {totals.failed}
        </span>
        <span className="text-[#b4b8c0]">
          <span className="text-[#25e487]">●</span> Successful: {totals.successful}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[140px]"
        role="img"
        aria-label="Security event trends for the last 24 hours"
      >
        {[0, 0.5, 1].map((fraction) => {
          const value = maxValue * fraction;
          const yy = y(value);
          return (
            <g key={fraction}>
              <line
                x1={left}
                y1={yy}
                x2={width - right}
                y2={yy}
                stroke="#30343b"
                strokeDasharray="3 4"
              />
              <text
                x={left - 6}
                y={yy + 4}
                textAnchor="end"
                fontSize="10"
                fill="#8c929c"
              >
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}

        <path d={line('total')} fill="none" stroke="#9285f5" strokeWidth="2" />
        <path d={line('failed')} fill="none" stroke="#f5b942" strokeWidth="2" />
        <path d={line('successful')} fill="none" stroke="#25e487" strokeWidth="2" />

        {[0, 6, 12, 18, 23].map(i => (
          <text
            key={i}
            x={x(i)}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fill="#8c929c"
          >
            {new Intl.DateTimeFormat('en-CA', {
              timeZone: 'America/Regina',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23'
            }).format(new Date(buckets[i].timestamp))}
          </text>
        ))}
      </svg>

      <p className="text-[#8c929c] text-[10px]">
        Counts are based on recorded events, not estimated threat activity.
      </p>
    </div>
  );
}
