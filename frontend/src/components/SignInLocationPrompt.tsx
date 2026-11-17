import { useEffect, useState } from 'react';

export default function SignInLocationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me/sign-in-location', {credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response => response.ok ? response.json() : {pending:false})
      .then(data => {if(!controller.signal.aborted) setVisible(Boolean(data.pending));})
      .catch(()=>{});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const open = async () => {
      setVisible(true);setError('');
      try { await prepare(); } catch {setError('Unable to start location sharing. Please try again.');}
    };
    window.addEventListener('rw-share-location', open);
    return () => window.removeEventListener('rw-share-location', open);
  }, []);
  async function prepare() {
    const response = await fetch('/api/me/sign-in-location/request', {method:'POST',credentials:'same-origin'});
    if (!response.ok) throw new Error('Unable to start location sharing. Please try again.');
  }
  async function save(payload: Record<string, unknown>) {
    const response = await fetch('/api/me/sign-in-location', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!response.ok) throw new Error('Unable to save your sign-in location. Please try again.');
    setVisible(false);
    window.dispatchEvent(new Event('rw-location-updated'));
  }
  async function choose(share: boolean) {
    if (busy) return;
    setBusy(true);setError('');
    try {
      await prepare();
      if (!share) {await save({status:'SKIPPED'});return;}
      if (!navigator.geolocation || !window.isSecureContext) {await save({status:'UNAVAILABLE'});return;}
      const result = await new Promise<GeolocationPosition | GeolocationPositionError>(resolve => navigator.geolocation.getCurrentPosition(resolve,resolve,{enableHighAccuracy:true,maximumAge:0,timeout:12000}));
      if ('coords' in result) await save({status:'GRANTED',latitude:result.coords.latitude,longitude:result.coords.longitude,accuracy_m:result.coords.accuracy,captured_at:new Date(result.timestamp).toISOString()});
      else {
        await save({status:result.code===1 ? 'DENIED' : 'UNAVAILABLE'});
        setVisible(true);
        setError(result.code===1 ? 'Location permission is blocked. Allow location in your browser’s site settings, then try again.' : 'Your device could not provide a location. Check that device location services are enabled, then try again.');
      }
    } catch(err) {setError(err instanceof Error ? err.message : 'Unable to record location.');}
    finally {setBusy(false);}
  }
  if (!visible) return null;
  return <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="sign-in-location-title" className="w-full max-w-md rounded-2xl border border-[#30343b] bg-[#14171c] p-6 text-white shadow-xl">
      <h2 id="sign-in-location-title" className="text-xl font-semibold">Share sign-in location</h2>
      <p className="mt-3 text-sm leading-6 text-[#b4b8c0]">Allow your browser to share your device location for this sign-in. Your location and its reported accuracy will be recorded in security logs and visible to security administrators.</p>
      <p className="mt-3 text-sm leading-6 text-[#8c929c]">You can continue without sharing. When available, your approximate public-IP location will be used instead.</p>
      {error && <p role="alert" className="mt-4 text-sm text-[#ff737b]">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={busy} onClick={()=>void choose(true)} className="rounded-lg bg-[#8f202b] px-4 py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Waiting for location…' : 'Allow location'}</button>
        <button disabled={busy} onClick={()=>void choose(false)} className="rounded-lg border border-[#30343b] px-4 py-2 text-sm text-[#b4b8c0] disabled:opacity-50">Continue without sharing</button>
      </div>
    </section>
  </div>;
}
