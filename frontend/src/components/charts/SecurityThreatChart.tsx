import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SecurityEvent } from '../../hooks/useSecurityOverview';

type Props = {
  events: SecurityEvent[];
};

export default function SecurityThreatChart({ events }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets = [];

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setMinutes(0, 0, 0);
      hour.setHours(hour.getHours() - i);

      buckets.push({
        timestamp: hour.getTime(),
        hour: hour.toLocaleTimeString('en-CA', {
          hour: '2-digit',
          hour12: false,
        }),
        failed: 0,
        successful: 0,
      });
    }

    for (const event of events) {
      const raw = event.created_at.trim().replace(' ', 'T');
      const iso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)
        ? raw
        : raw + 'Z';

      const date = new Date(iso);

      if (Number.isNaN(date.getTime())) continue;

      const hour = new Date(date);
      hour.setMinutes(0, 0, 0);

      const bucket = buckets.find(
        item => item.timestamp === hour.getTime()
      );

      if (!bucket) continue;

      if (event.event_type === 'LOGIN_FAILED') {
        bucket.failed++;
      } else if (event.event_type === 'LOGIN_SUCCESS') {
        bucket.successful++;
      }
    }

    return buckets;
  }, [events]);

  return (
    <div className="h-full min-h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="rwFailedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff454f" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#ff454f" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="#30343b"
            strokeDasharray="3 6"
          />

          <XAxis
            dataKey="hour"
            stroke="#8c929c"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            interval={3}
          />

          <YAxis
            stroke="#8c929c"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fontSize: 10 }}
          />

          <Tooltip
            contentStyle={{
              background: '#14171c',
              border: '1px solid #30343b',
              borderRadius: 10,
              color: '#f5f5f5',
            }}
          />

          <Area
            type="monotone"
            dataKey="failed"
            name="Failed logins"
            stroke="#ff454f"
            strokeWidth={2}
            fill="url(#rwFailedGradient)"
            animationDuration={650}
          />

          <Area
            type="monotone"
            dataKey="successful"
            name="Successful logins"
            stroke="#25e487"
            strokeWidth={2}
            fill="none"
            animationDuration={650}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
