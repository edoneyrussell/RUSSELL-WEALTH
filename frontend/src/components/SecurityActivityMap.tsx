import { useEffect, useState } from 'react';
import { getLocale } from '../i18n/language.ts';
import { useSecurityFetch } from '../demo/securityDemo';
import type { SecurityEvent } from '../hooks/useSecurityOverview';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type MappedSecurityEvent = SecurityEvent & {
  latitude: number | null; longitude: number | null;
  city?: string | null; country?: string | null; location_basis?: string;
};
type Props = { events: SecurityEvent[]; selectedEventId?: number | null };
function FitActivity({ points }: {points: MappedSecurityEvent[]}) {
  const map = useMap();
  const coordinates = JSON.stringify(points.map(point => [point.latitude, point.longitude]));
  useEffect(() => { map.invalidateSize(); map.fitWorld({padding:[8,8]}); }, [map]);
  useEffect(() => {
    const bounds: [number,number][] = JSON.parse(coordinates);
    if (bounds.some(point => !map.getBounds().contains(point))) {
      map.fitBounds(bounds, {padding:[20,20], maxZoom:map.getZoom()});
    }
  }, [coordinates, map]);
  return null;
}
function recordedAt(value: string) {
  const normalized = value.replace(' ', 'T');
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : normalized + 'Z');
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(getLocale(), {timeZone:'America/Regina'});
}
export default function SecurityActivityMap({events, selectedEventId}: Props) {
  const securityFetch = useSecurityFetch();
  const [activity, setActivity] = useState<MappedSecurityEvent[] | null>(null);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const response = await securityFetch('/api/security/activity-map', {credentials:'include',cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error('Login activity unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) {setActivity(data.events ?? []);setTruncated(Boolean(data.truncated));setError('');}
      } catch { if (!controller.signal.aborted) setError('Login activity unavailable'); }
      finally { loading = false; }
    }
    window.addEventListener('rw-location-updated', refresh);
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {controller.abort();window.clearInterval(timer);window.removeEventListener('rw-location-updated', refresh);};
  }, [securityFetch]);
  // Demo data can already include coordinates; real activity comes from the login feed.
  const records = activity ?? events.filter(event => event.event_type.startsWith('LOGIN_')).map(event => ({...event, latitude:null,longitude:null} as MappedSecurityEvent));
  const located = records.filter(event => typeof event.latitude === 'number' && typeof event.longitude === 'number' && Number.isFinite(event.latitude) && Number.isFinite(event.longitude) && Math.abs(event.latitude)<=90 && Math.abs(event.longitude)<=180);
  const groups = new Map<string, MappedSecurityEvent[]>();
  for (const event of located) {
    const key = `${event.latitude},${event.longitude}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return <div className="relative h-full min-h-[180px] w-full overflow-hidden rounded-[10px] bg-[#10151b]">
    <MapContainer center={[20, 0]} zoom={0} minZoom={0} scrollWheelZoom style={{height:'100%',width:'100%',background:'#10151b'}}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <FitActivity points={located}/>
      {Array.from(groups.entries()).map(([key, group]) => {
        const event = group[0];
        const success = group.some(item => ['LOGIN_SUCCESS','SESSION_LOCATION_SHARED'].includes(item.event_type));
        const color = success ? '#25e487' : group.some(item => item.severity === 'CRITICAL') ? '#ff454f' : '#f5b942';
        const selected = group.some(item => item.id === selectedEventId);
        return <CircleMarker key={key} center={[event.latitude!,event.longitude!]} radius={selected ? 11 : 8} pathOptions={{color,fillColor:color,fillOpacity:0.85,weight:selected ? 3 : 2}}>
          {group.length > 1 && <Tooltip permanent direction="top" offset={[0,-8]}>{group.length} logins</Tooltip>}
          <Popup><div className="max-h-[240px] min-w-[200px] overflow-y-auto">
            <strong>{[event.location_basis === "BROWSER_REPORTED" ? event.location : event.city,event.country].filter(Boolean).join(', ') || 'Approximate IP location'}</strong>
            {group.map(item => <article key={item.id} className="mt-3 border-t border-gray-300 pt-2 text-xs">
              <strong>{item.event_type === 'SESSION_LOCATION_SHARED' ? 'Session location shared' : item.event_type === 'LOGIN_SUCCESS' ? 'Successful Login' : 'Failed Login'}</strong>
              {item.location_basis === "BROWSER_REPORTED" && <div>Device-reported location · ±{Math.round(item.accuracy_m ?? 0)} m</div>}
              <div className="break-all">{item.email ?? 'Unknown account'}</div><div>{item.source_ip}</div><div>{recordedAt(item.created_at)} CST</div>
            </article>)}
          </div></Popup>
        </CircleMarker>;
      })}
    </MapContainer>
    <button type="button" onClick={() => window.dispatchEvent(new Event('rw-share-location'))} className="absolute right-2 top-2 z-[1000] rounded-lg border border-[#30343b] bg-[#14171c] px-3 py-2 text-xs text-white">Share my location</button>
    <details className="absolute bottom-1 left-1 z-[1000] max-w-[85%] rounded border border-[#30343b] bg-[#14171c]/95 px-2 py-1 text-[10px] text-[#b4b8c0]">
      <summary className="cursor-pointer"><span className="text-[#25e487]">● Successful</span> · <span className="text-[#f5b942]">● Failed</span> · {located.length} mapped · {records.length-located.length} unlocated</summary>
      <div className="max-h-[100px] overflow-y-auto pt-2">
        <p>Last 24 hours · Refreshes every 5 seconds</p>
        <p>Device locations require browser permission. Other locations use approximate public-IP data.</p>
        {error && <p role="status">{error}</p>}
        {truncated && <p>Showing the latest 200 logins.</p>}
        {records.filter(item => item.latitude === null).map(item => <p key={item.id}>{item.email ?? 'Unknown account'} · {item.source_ip} · {recordedAt(item.created_at)} · Location unavailable</p>)}
      </div>
    </details>
  </div>;
}
