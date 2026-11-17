export type TrendBucket = {hour: string; total: number; failed: number; successful: number};
const HOUR = 3600000;
/** Fill absent hours with actual zero counts and align UTC database buckets. */
export function threatBuckets(trends: TrendBucket[], now: number) {
  const currentHour = Math.floor(now / HOUR) * HOUR;
  const records = new Map(trends.map(record => {
    const raw = record.hour.trim().replace(' ', 'T');
    const timestamp = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + 'Z');
    return [Math.floor(timestamp / HOUR) * HOUR, record];
  }));
  const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  return Array.from({length:24}, (_, index) => {
    const timestamp = currentHour - (23-index)*HOUR;
    const record = records.get(timestamp);
    return {timestamp, total:count(record?.total), failed:count(record?.failed), successful:count(record?.successful)};
  });
}
