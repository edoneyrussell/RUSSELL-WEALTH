import { useEffect } from 'react';
import type { SecurityEvent } from '../../hooks/useSecurityOverview';

type Props = {
  event: SecurityEvent | null;
  onClose: () => void;
};

export default function SecurityInvestigationDrawer({
  event,
  onClose,
}: Props) {
  useEffect(() => {
    if (!event) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [event, onClose]);

  if (!event) return null;

  const fields = [
    ['Event ID', `#${event.id}`],
    ['Event type', event.event_type],
    ['Severity', event.severity],
    ['Account', event.email ?? 'Unknown'],
    ['Source IP', event.source_ip ?? 'Unknown'],
    ['Recorded time', event.created_at],
    ['Details', event.details ?? 'No additional details recorded'],
  ];

  return (
    <div className="rw-investigation-overlay" onClick={onClose}>
      <aside
        className="rw-investigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Security event investigation"
        onClick={e => e.stopPropagation()}
      >
        <div className="rw-investigation-header">
          <div>
            <span className="rw-investigation-eyebrow">
              RUSSELL WEALTH / SECURITY
            </span>
            <h2>Event Investigation</h2>
            <p>Recorded security event #{event.id}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close investigation">
            ✕
          </button>
        </div>

        <div className="rw-investigation-fields">
          {fields.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="rw-investigation-footer">
          <span className="rw-investigation-dot" />
          Event retrieved from the security database
        </div>
      </aside>
    </div>
  );
}
