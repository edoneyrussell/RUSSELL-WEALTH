import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type MappedSecurityEvent = {
  id: number;
  event_type: string;
  source_ip: string | null;
  email: string | null;
  details: string | null;
  created_at: string;
  severity: string;
  latitude: number | null;
  longitude: number | null;
  city?: string | null;
  country?: string | null;
};

type Props = {
  events: MappedSecurityEvent[];
  selectedEventId?: number | null;
};

function reginaTime(value: string) {
  const normalized = value.replace(' ', 'T');
  const date = new Date(
    /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
      ? normalized
      : normalized + 'Z'
  );

  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Regina',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export default function SecurityActivityMap({
  events,
  selectedEventId
}: Props) {
  const located = events.filter(
    (event) =>
      typeof event.latitude === 'number' &&
      typeof event.longitude === 'number' &&
      Number.isFinite(event.latitude) &&
      Number.isFinite(event.longitude)
  );

  const unlocated = events.length - located.length;

  return (
    <div className="relative w-full h-full min-h-[180px] rounded-[10px] overflow-hidden bg-[#10151b]">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#10151b' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {located.map((event) => {
          const color =
            event.severity === 'CRITICAL'
              ? '#ff454f'
              : event.event_type === 'LOGIN_FAILED'
                ? '#f5b942'
                : '#25e487';

          return (
            <CircleMarker
              key={event.id}
              center={[event.latitude!, event.longitude!]}
              radius={selectedEventId === event.id ? 11 : 7}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: selectedEventId === event.id ? 3 : 1
              }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>
                    {event.event_type === 'LOGIN_SUCCESS'
                      ? 'Successful Login'
                      : event.event_type === 'LOGIN_FAILED'
                        ? 'Failed Login'
                        : event.event_type}
                  </strong>
                  <div>Account: {event.email ?? 'Unknown'}</div>
                  <div>IP: {event.source_ip ?? 'Unknown'}</div>
                  <div>
                    Approx. location: {[event.city, event.country]
                      .filter(Boolean).join(', ') || 'Unknown'}
                  </div>
                  <div>Regina time: {reginaTime(event.created_at)}</div>
                  <div>Severity: {event.severity}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-1 left-1 z-[1000] bg-[#14171c]/95 border border-[#30343b] rounded-[5px] px-1.5 py-1 text-[8px] text-[#b4b8c0] pointer-events-none">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[#25e487]">● Successful</span>
          <span className="text-[#f5b942]">● Failed</span>
          <span className="text-[#ff454f]">● Critical</span>
        </div>
        <div className="mt-0.5">
          {located.length} mapped · {unlocated} location unavailable
        </div>
        <div>IP-based locations are approximate</div>
      </div>
    </div>
  );
}
