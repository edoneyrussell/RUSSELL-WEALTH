import LanguagePreferences from '../components/LanguagePreferences';
import { useEffect, useState } from "react";
import { logout } from "../auth";

type Preferences = {
  email_notifications: boolean;
  security_notifications: boolean;
  compact_view: boolean;
};

const defaults: Preferences = {
  email_notifications: true,
  security_notifications: true,
  compact_view: false
};

const panel = "rounded-2xl border border-[#34404d] bg-[#141a22] p-5 md:p-7";
const input = "w-full rounded-lg border border-[#3b4857] bg-[#0a0e13] px-4 py-3 text-sm text-white outline-none focus:border-[#b8c6d5]";
const button = "rounded-lg bg-[#b8c6d5] px-5 py-3 text-sm font-semibold text-[#0a0e13] disabled:opacity-50";

async function jsonResponse(response: Response) {
  if (!(response.headers.get("content-type") || "").includes("application/json")) {
    throw new Error(`Account API returned HTTP ${response.status} instead of JSON.`);
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export default function CustomerAccountManagement() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded && window.location.hash.startsWith('#languages')) {
      document.getElementById('languages')?.scrollIntoView({ block: 'start' });
    }
  }, [loaded]);

  useEffect(() => {
    let active = true;
    fetch("/api/customer/account-management", { credentials: "same-origin" })
      .then(jsonResponse)
      .then(data => {
        if (!active) return;
        setName(data.name);
        setEmail(data.email);
        setStatus(data.account_status);
        setPreferences({ ...defaults, ...data.preferences });
        setLoaded(true);
      })
      .catch(e => { if (active) setError(String(e.message || e)); });
    return () => { active = false; };
  }, []);

  async function save(action: string, payload: object) {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/customer/account-management", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const result = await jsonResponse(response);
      if (action === "preferences") setPreferences(result.preferences);
      if (action === "password") {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      setMessage(action === "password"
        ? "Password changed successfully."
        : "Preferences saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }

  const sections = [
    {
      title: "Personal Information",
      subtitle: "Manage your identity and contact details",
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-[#8997a7]">Full name</p>
            <p className="mt-1 font-medium">{name}</p>
          </div>
          <div>
            <p className="text-xs text-[#8997a7]">Email address</p>
            <p className="mt-1 break-all font-medium">{email}</p>
          </div>
          <a href="/customer/settings"
             className="inline-block rounded-lg border border-[#4a5b6b] px-4 py-3 text-sm text-[#d2e0ec] hover:bg-[#253340]">
            Edit in My Profile
          </a>
        </div>
      )
    },
    {
      title: "Password & Security",
      subtitle: "Secure your account credentials",
      content: (
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={e => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              setError("New passwords do not match.");
              return;
            }
            void save("password", {
              current_password: currentPassword,
              new_password: newPassword
            });
          }}>
            <label className="block text-xs text-[#a6b3c1]">
              Current password
              <input className={input} type="password"
                autoComplete="current-password" required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)} />
            </label>
            <label className="block text-xs text-[#a6b3c1]">
              New password
              <input className={input} type="password"
                autoComplete="new-password" minLength={7} maxLength={128}
                required value={newPassword}
                onChange={e => setNewPassword(e.target.value)} />
            </label>
            <label className="block text-xs text-[#a6b3c1]">
              Confirm new password
              <input className={input} type="password"
                autoComplete="new-password" required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} />
            </label>
            <button className={button} type="submit" disabled={!!busy}>
              {busy === "password" ? "Updating..." : "Change Password"}
            </button>
          </form>
          <a href="/customer/activity"
             className="block text-sm text-[#b8cddd] underline underline-offset-4">
            Review Security & Activity
          </a>
        </div>
      )
    },
    {
      id: "languages",
      title: "Languages",
      subtitle: "Choose English or French for the website",
      content: <LanguagePreferences />
    },
    {
      title: "Notifications & Preferences",
      subtitle: "Save your personal account preferences",
      content: (
        <div className="space-y-5">
          {([
            ["email_notifications", "Email notifications",
              "Preference for optional account emails"],
            ["security_notifications", "Security notifications",
              "Preference for security updates"],
            ["compact_view", "Compact account view",
              "Your saved display preference"]
          ] as const).map(([key, title, description]) => (
            <label key={key}
              className="flex cursor-pointer items-center justify-between gap-4 border-b border-[#2d3742] pb-4">
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-1 block text-xs text-[#8897a8]">
                  {description}
                </span>
              </span>
              <input type="checkbox" className="h-5 w-5 accent-[#b8c6d5]"
                checked={preferences[key]}
                onChange={e => setPreferences(previous => ({
                  ...previous, [key]: e.target.checked
                }))} />
            </label>
          ))}
          <button type="button" className={button} disabled={!!busy}
            onClick={() => void save("preferences", { preferences })}>
            {busy === "preferences" ? "Saving..." : "Save Preferences"}
          </button>
          <p className="text-xs text-[#8e9dad]">
            These preferences are saved to your account. Delivery of optional
            notifications and compact layouts requires those features to
            consume the saved preferences.
          </p>
        </div>
      )
    },
    {
      title: "Investment Account",
      subtitle: "Your portfolio and financial activity",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#a6b3c1]">
            Account status: <span className="text-white">{status}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="rounded-lg border border-[#46586a] px-4 py-3 text-sm"
               href="/portfolio">View Portfolio</a>
            <a className="rounded-lg border border-[#46586a] px-4 py-3 text-sm"
               href="/transactions">Transaction History</a>
            <a className="rounded-lg border border-[#46586a] px-4 py-3 text-sm"
               href="/deposit">Deposit Funds</a>
            <a className="rounded-lg border border-[#46586a] px-4 py-3 text-sm"
               href="/withdraw">Withdraw Funds</a>
          </div>
        </div>
      )
    },
    {
      title: "Privacy & Account Management",
      subtitle: "Access and account information",
      content: (
        <div className="space-y-5">
          <p className="text-sm text-[#a6b3c1]">
            Your activity history is available in Security & Activity.
            Financial records are retained by the application.
          </p>
          <a href="/customer/activity"
             className="block text-sm text-[#b8cddd] underline underline-offset-4">
            View My Account Activity
          </a>
          <div className="border-t border-[#35404b] pt-5">
            <button type="button" onClick={logout}
              className="rounded-lg border border-[#77434a] px-5 py-3 text-sm text-[#ff9ba5]">
              Sign Out
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="rw-fintech-workspace rw-account-management min-h-screen bg-[#080a0d] text-[#f2f5f8]">
      <main className="mx-auto max-w-[1050px] px-5 py-10">
        <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#8d9bac]">
              RUSSELL WEALTH / CUSTOMER ACCOUNT
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Account Management
            </h1>
            <p className="mt-2 text-sm text-[#9aa8b7]">
              Everything you need to manage your account in one place.
            </p>
          </div>
          <a href="/customer/settings"
             className="rounded-lg border border-[#394858] px-4 py-3 text-sm hover:bg-[#1b2632]">
            Back to Account Center
          </a>
        </div>

        {message && <p role="status"
          className="mb-5 rounded-lg border border-[#35634e] bg-[#142a22] p-4 text-sm text-[#a1e8c0]">{message}</p>}
        {error && <p role="alert"
          className="mb-5 rounded-lg border border-[#784047] bg-[#2c1b20] p-4 text-sm text-[#ffb1ba]">{error}</p>}

        {!loaded && !error && <p>Loading account settings...</p>}

        {loaded && (
          <div className="space-y-5">
            {sections.map((section, index) => (
              <details key={section.title} id={section.id} className={`rw-fintech-panel scroll-mt-6 ${panel}`} open={index === 0 || (section.id === 'languages' && window.location.hash.startsWith('#languages'))}>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{section.title}</h2>
                      <p className="mt-1 text-xs text-[#8e9eae]">{section.subtitle}</p>
                    </div>
                    <span className="text-xl text-[#a9bacb]">+</span>
                  </div>
                </summary>
                <div className="mt-6 border-t border-[#34404d] pt-6">
                  {section.content}
                </div>
              </details>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
