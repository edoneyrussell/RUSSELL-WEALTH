import { sharedFetch } from '../experience/sharedFetch';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

function announcePrompt(open: boolean) {
  document.documentElement.dataset.rwLocationPrompt = open ? 'open' : 'closed';
  window.dispatchEvent(new CustomEvent('rw-location-prompt', {detail:open}));
}
export default function SignInLocationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prepared = useRef(false);
  const interacted = useRef(false);
  const inFlight = useRef(false);
  function notify(message: string, type: 'success' | 'warning' | 'error' | 'info') {
    window.dispatchEvent(new CustomEvent('rw-toast', {detail:{message,type}}));
  }
  useLayoutEffect(()=>{announcePrompt(true);},[]);
  useEffect(() => {
    const controller = new AbortController();
    sharedFetch('/api/me/sign-in-location', {credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response => response.ok ? response.json() : {pending:false})
      .then(data => {if(!controller.signal.aborted && !interacted.current) {prepared.current=Boolean(data.pending);setVisible(Boolean(data.pending));announcePrompt(Boolean(data.pending));}})
      .catch(()=>{if(!controller.signal.aborted)announcePrompt(false);});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const open = async () => {
      if (inFlight.current) return;
      interacted.current=true;
      inFlight.current=true;setBusy(true);setVisible(true);announcePrompt(true);setError('');
      try { await prepare(); } catch {setError('Unable to start location sharing. Please try again.');}
      finally {inFlight.current=false;setBusy(false);}
    };
    window.addEventListener('rw-share-location', open);
    return () => window.removeEventListener('rw-share-location', open);
  }, []);
  async function prepare() {
    const response = await fetch('/api/me/sign-in-location/request', {method:'POST',credentials:'same-origin'});
    if (!response.ok) throw new Error('Unable to start location sharing. Please try again.');
    prepared.current=true;
  }
  async function save(payload: Record<string, unknown>) {
    const response = await fetch('/api/me/sign-in-location', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!response.ok) throw new Error('Unable to save your sign-in location. Please try again.');
    prepared.current=false;
    window.dispatchEvent(new Event('rw-location-updated'));
  }
  async function choose(share: boolean) {
    if (inFlight.current) return;
    interacted.current=true;inFlight.current=true;
    setVisible(false);announcePrompt(false);setBusy(true);setError('');
    // Dismiss immediately: location collection must not block the dashboard.
    const location = share && navigator.geolocation && window.isSecureContext
      ? new Promise<GeolocationPosition | GeolocationPositionError>(resolve =>
          navigator.geolocation.getCurrentPosition(resolve,resolve,{enableHighAccuracy:false,maximumAge:60000,timeout:4000}))
      : null;
    if (location) notify('Sharing your sign-in location in the background.', 'info');
    try {
      if (!prepared.current) await prepare();
      if (!share) {await save({status:'SKIPPED'});return;}
      if (!location) {
        await save({status:'UNAVAILABLE'});
        notify('Device location is unavailable. You can continue using the dashboard.', 'warning');
        return;
      }
      const result = await location;
      if ('coords' in result) {
        await save({status:'GRANTED',latitude:result.coords.latitude,longitude:result.coords.longitude,accuracy_m:result.coords.accuracy,captured_at:new Date(result.timestamp).toISOString()});
        notify('Sign-in location saved.', 'success');
      } else {
        await save({status:result.code===1 ? 'DENIED' : 'UNAVAILABLE'});
        notify(result.code===1 ? 'Location permission is blocked. You can enable it in your browser’s site settings and retry from the activity map.' : 'Your device could not provide a location. You can retry from the activity map.', 'warning');
      }
    } catch(err) {notify(err instanceof Error ? err.message : 'Unable to record location.', 'error');}
    finally {inFlight.current=false;setBusy(false);}
  }
  if (!visible) return null;
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="sign-in-location-title" className="w-full max-w-md rounded-2xl border border-[#30343b] bg-[#14171c] p-6 text-white shadow-xl">
      <h2 id="sign-in-location-title" className="text-xl font-semibold">Share sign-in location</h2>
      <p className="mt-3 text-sm leading-6 text-[#b4b8c0]">Allow your browser to share your device location for this sign-in. Your location and its reported accuracy will be recorded in security logs and visible to security administrators.</p>
      <p className="mt-3 text-sm leading-6 text-[#8c929c]">You can continue without sharing. When available, your approximate public-IP location will be used instead.</p>
      {error && <p role="alert" className="mt-4 text-sm text-[#ff737b]">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={busy} onClick={()=>void choose(true)} className="rounded-lg bg-[#8f202b] px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Preparing…' : 'Allow location'}</button>
        <button disabled={busy} onClick={()=>void choose(false)} className="rounded-lg border border-[#30343b] px-4 py-2 text-sm text-[#b4b8c0] disabled:opacity-50">Continue without sharing</button>
      </div>
    </section>
  </div>;
}
