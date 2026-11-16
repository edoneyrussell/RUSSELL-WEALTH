import { notifyProfileUpdated } from "../hooks/useAccountProfile";
import { useEffect, useState, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ShieldLock } from 'lucide-react';
import { logout } from '../auth';

type Account = {
  authenticated?: boolean;
  name?: string;
  email?: string;
  profile_photo?: string | null;
  role?: string;
};

const emptyProfile = { password_hint: '', first_name: '', last_name: '', email: '', phone: '', address_line1: '', address_line2: '', city: '', region: '', postal_code: '', country: '' };
type Profile = typeof emptyProfile;

const features = [
  {
    title: 'My Profile',
    description: 'Personal information and profile picture',
    icon: '◎',
    status: 'Coming soon',
  },
  {
    title: 'Account Settings',
    description: 'Password, preferences and account management',
    icon: '⚙',
    href: '/customer/account-settings',
  },
  {
    title: 'Languages',
    description: 'Choose English or French for the website',
    icon: '文',
    href: '/customer/account-settings#languages',
  },
  {
    title: 'Security & Activity',
    description: 'Your personal security and transaction activity',
    icon: '◇',
    href: '/customer/activity',
  },
];

async function readProfileResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    if (response.redirected) {
      throw new Error(
        "Your session may have expired. Sign in again."
      );
    }

    throw new Error(
      `Profile API returned HTTP ${response.status} instead of JSON. ` +
      "Check that the Flask backend is running and /api/me/profile is routed correctly."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Profile request failed (${response.status}).`);
  }

  return data;
}

export default function CustomerSettings() {
  const [adminNotice, setAdminNotice] = useState(false);
  const adminDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (adminNotice) adminDialog.current?.showModal();
    else adminDialog.current?.close();
  }, [adminNotice]);
  const [account, setAccount] = useState<Account | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<Profile>(emptyProfile);
  const [currentPassword, setCurrentPassword] = useState("");
  const profileDialog = useRef<HTMLElement>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/me', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Account | null) => {
        if (active && data) setAccount(previous => ({ ...previous, ...data }));
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/me/profile", {
      credentials: "same-origin"
    })
      .then(readProfileResponse)
      .then(data => {
        if (!active) return;
        const loaded = { ...emptyProfile, ...Object.fromEntries(Object.keys(emptyProfile).map(key => [key, data[key] || ''])) } as Profile;
        setProfile(loaded);
        setSavedProfile(loaded);
        setAccount(previous => ({
          ...previous,
          name: data.name,
          email: data.email,
          role: data.role
        }));
      })
      .catch(() => {
        if (active) setProfileError("Unable to load profile.");
      });

    return () => { active = false; };
  }, []);

  function openProfile() {
    setProfile({ ...savedProfile });
    setCurrentPassword("");
    setProfileError("");
    setProfileMessage("");
    setEditingProfile(true);
  }

  useEffect(() => {
    if (!editingProfile) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = profileDialog.current;
    panel?.querySelector<HTMLElement>('button, input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingProfile) setEditingProfile(false);
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, a[href]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
      if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown', keyboard);
    return () => {document.body.style.overflow = previousOverflow;document.removeEventListener('keydown', keyboard);previous?.focus();};
  }, [editingProfile, savingProfile]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true); setProfileError(''); setProfileMessage('');
    try {
      const response = await fetch('/api/me/profile', {
        method: 'PUT', credentials: 'same-origin', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({...profile, current_password: currentPassword})
      });
      const data = await readProfileResponse(response);
      const updated = { ...emptyProfile, ...Object.fromEntries(Object.keys(emptyProfile).map(key => [key, data[key] || ''])) } as Profile;
      setProfile(updated); setSavedProfile(updated); setCurrentPassword('');
      setAccount(previous => ({...previous, name:data.name, email:data.email}));
      setProfileMessage(data.email !== account?.email ? 'Profile saved. Use your new email address to sign in.' : 'Your profile has been updated.');
      notifyProfileUpdated();
    } catch (error) {setProfileError(error instanceof Error ? error.message : 'Unable to save profile.');}
    finally {setSavingProfile(false);}
  }

  const name = account?.name || 'Customer';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'ER';

  const isAdmin = account?.role === 'SOC_ADMIN';

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Use a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Maximum photo size is 5 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setPhotoError("");

    try {
      const form = new FormData();
      form.append("photo", file);

      const response = await fetch("/api/me/photo", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Photo upload failed.");
      }

      setAccount(previous => previous
        ? { ...previous, profile_photo: data.photo }
        : previous
      );

      notifyProfileUpdated();
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Photo upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handlePhotoRemove = async () => {
    setUploading(true);
    setPhotoError("");

    try {
      const response = await fetch("/api/me/photo", {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not remove photo.");
      }

      setAccount(previous => previous
        ? { ...previous, profile_photo: null }
        : previous
      );

      notifyProfileUpdated();
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Could not remove photo."
      );
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#080a0d] text-[#f5f5f5] font-['Inter']">
      <header className="border-b border-[#30343b] bg-[#0b0d11]">
        <div className="mx-auto max-w-[1120px] px-6 py-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8c929c]">
              RUSSELL WEALTH
            </p>
            <p className="text-[13px] mt-1 text-[#d7d9de]">
              Customer Account Center
            </p>
          </div>
          <a
            href="/dashboard"
            className="rounded-lg border border-[#30343b] px-4 py-2 text-[12px] text-[#d7d9de] hover:bg-[#1b1e24]"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-6 py-10">
        <div className="mb-8">
          <p className="text-[#8c929c] text-[12px] uppercase tracking-[0.16em]">
            Profile & Preferences
          </p>
          <h1 className="text-[30px] font-semibold mt-2">
            Account Settings
          </h1>
          <p className="text-[#8c929c] text-[13px] mt-2">
            Manage your customer profile, investments, and account access.
          </p>
        </div>

        <section className="rounded-xl border border-[#30343b] bg-[#14171c] p-6 mb-8">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#526780] bg-[#292e36] text-[23px] font-semibold">
              {account?.profile_photo ? (
                <img
                  src={account.profile_photo}
                  alt="Profile"
                  className="size-full object-cover"
                />
              ) : initials}
            </div>

            <div className="flex-1 min-w-[170px]">
              <h2 className="text-[20px] font-semibold">{name}</h2>
              <p className="text-[#8c929c] text-[12px] mt-1">
                {account?.email || 'Customer account'}
              </p>
              <p className="text-[#b4b8c0] text-[11px] mt-2">
                {isAdmin ? 'Linked Customer Account · SOC Administrator' : 'Russell Wealth Customer'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />

              <button
                type="button"
                disabled={uploading}
                onClick={() => photoInput.current?.click()}
                className="rounded-lg bg-[#B8C6D5] px-4 py-2 text-[12px] font-semibold text-[#090C10] hover:bg-[#D5DFEA] disabled:opacity-50"
              >
                {uploading ? "Uploading..." : account?.profile_photo ? "Change Photo" : "Add Photo"}
              </button>

              {account?.profile_photo && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handlePhotoRemove()}
                  className="rounded-lg border border-[#693a40] px-4 py-2 text-[12px] text-[#ff9299] hover:bg-[#292026] disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          {photoError && (
            <p role="alert" className="mt-4 text-xs text-[#F1A8A8]">
              {photoError}
            </p>
          )}
        </section>

        {profileMessage && !editingProfile && (
          <p role="status" className="mb-5 text-sm text-[#7DD9A8]">
            {profileMessage}
          </p>
        )}

        {profileError && !editingProfile && (
          <p role="alert" className="mb-5 text-sm text-[#F1A8A8]">
            {profileError}
          </p>
        )}

        {editingProfile && createPortal(
          <div className="rw-profile-modal fixed inset-0 z-[30000] flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:items-center" onMouseDown={event => {if (event.target === event.currentTarget && !savingProfile) setEditingProfile(false);}}>
            <section ref={profileDialog} role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" className="my-auto max-h-[calc(100dvh-32px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#34483b] bg-[#13191a] text-[#ecf1ed] shadow-2xl">
              <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#283332] bg-[#13191a] px-6 py-5">
                <div><p className="text-xs text-[#91a498]">YOUR ACCOUNT</p><h2 id="profile-editor-title" className="mt-1 text-2xl font-medium">Edit my profile</h2></div>
                <button type="button" aria-label="Close profile editor" disabled={savingProfile} onClick={() => setEditingProfile(false)} className="size-11 rounded-lg border border-[#34483b] text-xl">×</button>
              </header>
              <form onSubmit={saveProfile} className="space-y-7 px-6 py-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#526780] bg-[#24372c] text-xl">{account?.profile_photo ? <img src={account.profile_photo} alt="Profile" className="size-full object-cover"/> : initials}</div>
                  <div><p className="font-medium">Profile photo</p><button type="button" disabled={uploading || savingProfile} onClick={() => photoInput.current?.click()} className="mt-2 min-h-11 text-sm text-[#c2edce] underline">{uploading ? 'Uploading…' : account?.profile_photo ? 'Change photo' : 'Add photo'}</button></div>
                  {photoError && <p role="alert" className="w-full text-sm text-red-300">{photoError}</p>}
                </div>
                <fieldset className="space-y-4"><legend className="mb-4 text-lg font-medium">Personal information</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([['first_name','First name','given-name'],['last_name','Last name','family-name']] as const).map(([key,label,autoComplete]) => <label key={key} className="block text-sm text-[#a8b6ad]">{label}<input required maxLength={80} autoComplete={autoComplete} value={profile[key]} onChange={event=>setProfile(previous=>({...previous,[key]:event.target.value}))} className="rw-profile-input"/></label>)}
                  </div>
                  <p className="text-xs leading-5 text-[#91a498]">Your name appears on your profile, dashboard, and account navigation.</p>
                </fieldset>
                <fieldset className="space-y-4"><legend className="mb-4 text-lg font-medium">Contact &amp; sign-in</legend>
                  <label className="block text-sm text-[#a8b6ad]">Login email<input required type="email" maxLength={254} autoComplete="email" value={profile.email} onChange={event=>setProfile(previous=>({...previous,email:event.target.value}))} className="rw-profile-input"/></label>
                  <p className="text-xs leading-5 text-[#91a498]">Changing this address updates the email you use to sign in and reset your password.</p>
                  {profile.email.trim().toLowerCase() !== savedProfile.email.toLowerCase() && <label className="block text-sm text-[#a8b6ad]">Current password<input required type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)} className="rw-profile-input"/><span className="mt-2 block text-xs text-[#91a498]">Confirm your password to change your login email. Other sessions will be signed out.</span></label>}
                  <label className="block text-sm text-[#a8b6ad]">Password hint (optional)<input maxLength={200} autoComplete="off" value={profile.password_hint} onChange={event=>setProfile(previous=>({...previous,password_hint:event.target.value}))} className="rw-profile-input"/><span className="mt-2 block text-xs">This reminder appears on sign-in after entering your email. Do not enter your password. Leave blank to remove it.</span></label>
                  <label className="block text-sm text-[#a8b6ad]">Phone number (optional)<input type="tel" maxLength={40} autoComplete="tel" value={profile.phone} onChange={event=>setProfile(previous=>({...previous,phone:event.target.value}))} className="rw-profile-input"/></label>
                </fieldset>
                <fieldset><legend className="mb-4 text-lg font-medium">Mailing address (optional)</legend><div className="grid gap-4 sm:grid-cols-2">
                  {([['address_line1','Street address','address-line1',160],['address_line2','Apartment or unit','address-line2',160],['city','City','address-level2',100],['region','Province / state','address-level1',100],['postal_code','Postal / ZIP code','postal-code',24],['country','Country','country-name',80]] as const).map(([key,label,autoComplete,maxLength])=><label key={key} className={`block text-sm text-[#a8b6ad] ${key.startsWith('address_')?'sm:col-span-2':''}`}>{label}<input maxLength={maxLength} autoComplete={autoComplete} value={profile[key]} onChange={event=>setProfile(previous=>({...previous,[key]:event.target.value}))} className="rw-profile-input"/></label>)}
                </div></fieldset>
                <p className="text-xs leading-5 text-[#91a498]">Contact details are saved to your profile. This demonstration platform does not verify your phone number or mailing address.</p>
                <a href="/customer/account-settings" className="inline-block text-sm text-[#c2edce] underline">Manage password and account security →</a>
                {profileError && <p role="alert" className="rounded-lg border border-red-900 p-3 text-sm text-red-300">{profileError}</p>}
                {profileMessage && <p role="status" className="rounded-lg border border-[#43634e] p-3 text-sm text-[#c2edce]">{profileMessage}</p>}
                <footer className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-[#283332] bg-[#13191a] py-4">
                  <button type="button" disabled={savingProfile} onClick={()=>setEditingProfile(false)} className="min-h-11 rounded-full border border-[#34483b] px-6 text-sm">Close</button>
                  <button type="submit" disabled={savingProfile || uploading} className="min-h-11 rounded-full bg-[#c2edce] px-6 text-sm font-semibold text-[#14251a] disabled:opacity-50">{savingProfile?'Saving…':'Save changes'}</button>
                </footer>
              </form>
            </section>
          </div>, document.body
        )}

        <h2 className="text-[16px] font-semibold mb-4">
          Customer Account Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const content = (
              <>
                <span className="flex size-[40px] items-center justify-center rounded-lg bg-[#292e36] text-[22px] text-[#d7d9de]">
                  {feature.icon}
                </span>
                <h3 className="text-[14px] font-semibold mt-5">
                  {feature.title}
                </h3>
                <p className="text-[#8c929c] text-[12px] mt-2">
                  {feature.description}
                </p>
                <p className="text-[#b4b8c0] text-[11px] mt-5">
                  {feature.href ? 'Open feature' : feature.status}
                </p>
              </>
            );

            if (feature.title === "My Profile") {
              return (
                <button
                  key={feature.title}
                  type="button"
                  onClick={openProfile}
                  className="rounded-xl border border-[#30343b] bg-[#14171c] p-5 text-left hover:border-[#777e89] transition-colors"
                >
                  <span className="flex size-[40px] items-center justify-center rounded-lg bg-[#292e36] text-[22px]">
                    {feature.icon}
                  </span>
                  <h3 className="mt-5 text-sm font-semibold">
                    My Profile
                  </h3>
                  <p className="mt-2 text-xs text-[#8c929c]">
                    Edit your name, email and profile photo.
                  </p>
                  <p className="mt-5 text-xs text-[#B8C6D5]">
                    {editingProfile ? "Close Profile Editor" : "Edit Profile"}
                  </p>
                </button>
              );
            }

            return feature.href ? (
              <a
                key={feature.title}
                href={feature.href}
                className="rounded-xl border border-[#30343b] bg-[#14171c] p-5 hover:border-[#777e89] transition-colors"
              >
                {content}
              </a>
            ) : (
              <div
                key={feature.title}
                className="rounded-xl border border-[#30343b] bg-[#14171c] p-5"
              >
                {content}
              </div>
            );
          })}
        </div>

        <h2 className="text-[16px] font-semibold mt-10 mb-4">
          Dashboard Access
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/dashboard"
            className="rounded-xl border border-[#30343b] bg-[#14171c] p-5 hover:border-[#777e89]"
          >
            <h3 className="text-[14px] font-semibold">Customer Dashboard</h3>
            <p className="text-[#8c929c] text-[12px] mt-2">
              Return to your investments and account overview.
            </p>
          </a>

          {isAdmin ? (
            <a
              href="/security"
              className="rounded-xl border border-[#30343b] bg-[#14171c] p-5 hover:border-[#777e89]"
            >
              <h3 className="text-[14px] font-semibold">Security Dashboard</h3>
              <p className="text-[#8c929c] text-[12px] mt-2">
                Return to SOC monitoring and security operations.
              </p>
            </a>
          ) : (
            <button type="button" onClick={() => setAdminNotice(true)} className="rounded-xl border border-[#30343b] bg-[#14171c] p-5 text-left transition hover:border-[#777e89]">
              <h3 className="text-[14px] font-semibold">Security Dashboard</h3>
              <p className="text-[#8c929c] text-[12px] mt-2">Learn about access to security operations.</p>
            </button>
          )}
        </div>

        <div className="rw-settings-logout border-t border-[#30343b] mt-10 pt-6 flex justify-between items-center gap-4">
          <span className="text-[#8c929c] text-[12px]">
            Russell Wealth · Customer
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-[#693a40] px-5 py-3 text-[#ff777e] text-[12px] hover:bg-[#292026]"
          >
            Log Out
          </button>
        </div>
      </main>
      <dialog ref={adminDialog} aria-labelledby="admin-only-title" onCancel={() => setAdminNotice(false)} onClose={() => setAdminNotice(false)} className="m-auto w-[calc(100%_-_40px)] max-w-md rounded-2xl border border-[#465364] bg-[#141b25] p-7 text-[#f5f5f5] shadow-2xl backdrop:bg-black/75">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-[#526780] bg-[#243247] text-[#c5d6ed]"><ShieldLock size={25}/></div>
        <h2 id="admin-only-title" className="text-xl font-semibold">For Russell Wealth admins only</h2>
        <p className="mt-4 text-sm leading-6 text-[#b4bfce]">This feature is for Russell Wealth admins only. If you want access to this feature, please contact the site administrator.</p>
        <button type="button" onClick={() => setAdminNotice(false)} className="mt-6 w-full rounded-xl border border-[#647e9e] bg-[#2a3b51] px-4 py-3 text-sm font-medium hover:bg-[#344b68]">Got it</button>
      </dialog>
    </div>
  );
}
