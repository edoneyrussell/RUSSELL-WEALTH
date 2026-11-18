import { sharedFetch } from '../experience/sharedFetch';
import { profileInitials } from '../utils/profileInitials';
import { useEffect, useState } from 'react';

type AccountProfile = { name?: string; email?: string; profile_photo?: string | null; roles?: string[] };
type ProfileFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function notifyProfileUpdated() {
  window.dispatchEvent(new Event('rw-profile-updated'));
  try { localStorage.setItem('rw-profile-sync', String(Date.now())); } catch { /* Polling also synchronizes devices. */ }
}

export function useAccountProfile(request: ProfileFetch = sharedFetch) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  useEffect(() => {
    let active = true;
    let pending = false;
    const controller = new AbortController();
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await request('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
        const data = response.ok ? await response.json() : null;
        if (active) setProfile(data);
      } catch { /* Keep the last profile during a temporary connection failure. */ }
      finally { pending = false; }
    };
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    const sync = (event: StorageEvent) => { if (event.key === 'rw-profile-sync') void load(); };
    void load();
    const timer = window.setInterval(visible, 120000);
    window.addEventListener('rw-profile-updated', load);
    window.addEventListener('focus', visible);
    window.addEventListener('online', visible);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('rw-profile-updated', load);
      window.removeEventListener('focus', visible);
      window.removeEventListener('online', visible);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [request]);
  const profileName = profile?.name?.trim() || '';
  const profilePhoto = profile?.profile_photo ?? null;
  const initials = profileInitials(profileName);
  return { profile, profileName, profilePhoto, initials };
}
