import { useEffect, useState, useRef } from 'react';
import { logout } from '../auth';

type Account = {
  authenticated?: boolean;
  name?: string;
  email?: string;
  profile_photo?: string | null;
  role?: string;
};

const features = [
  {
    title: 'My Profile',
    description: 'Personal information and profile picture',
    icon: '◎',
    status: 'Coming soon',
  },
  {
    title: 'Account Settings',
    description: 'Password and account preferences',
    icon: '⚙',
    status: 'Coming soon',
  },
  {
    title: 'Investment Accounts',
    description: 'View your portfolio and investments',
    icon: '◫',
    href: '/portfolio',
  },
  {
    title: 'Transaction History',
    description: 'Review your investment activity',
    icon: '▤',
    href: '/transactions',
  },
  {
    title: 'Security & Activity',
    description: 'Account access and login history',
    icon: '◇',
    status: 'Coming soon',
  },
  {
    title: 'Help & Support',
    description: 'Customer support and assistance',
    icon: '?',
    status: 'Coming soon',
  },
];

export default function CustomerSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetch('/api/me', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Account | null) => {
        if (active) setAccount(data);
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

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

      window.dispatchEvent(new Event("rw-profile-updated"));
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

      window.dispatchEvent(new Event("rw-profile-updated"));
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
            <div className="rounded-xl border border-[#30343b] bg-[#14171c] p-5">
              <h3 className="text-[14px] font-semibold">Security Dashboard</h3>
              <p className="text-[#8c929c] text-[12px] mt-2">
                Requires SOC Administrator authentication.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#30343b] mt-10 pt-6 flex justify-between items-center gap-4">
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
    </div>
  );
}
