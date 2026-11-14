import { useEffect, useState, type FormEvent } from "react";

export default function ForgotPassword() {
  const [link] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const [email, setEmail] = useState(() => link.get('email') || '');
  const [token] = useState(() => link.get('token') || '');
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "sent" | "confirm" | "done">(token ? "confirm" : "request");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hash) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function send(url: string, payload: object) {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", cache: "no-store", body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed. Please try again.");
  }
  async function requestLink(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await send("/api/password-reset/request", { email: email.trim() });
      setStep("sent");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to request a reset link."); }
    finally { setBusy(false); }
  }
  async function resetPassword(e: FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setBusy(true);
    try {
      await send("/api/password-reset/confirm", { email, token, password });
      setPassword(""); setConfirm(""); setStep("done");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reset your password."); }
    finally { setBusy(false); }
  }
  const input = "mt-2 w-full min-w-0 rounded-xl border border-[#414e46] bg-[#101713] px-4 py-3.5 text-base text-white outline-none focus:border-[#c2edce]";
  const button = "block w-full rounded-full bg-[#c2edce] px-5 py-3.5 text-center font-semibold text-[#14251a] transition hover:bg-[#dcf8e3] disabled:opacity-50";
  return <main className="flex min-h-screen items-center justify-center bg-[#0c1011] px-5 py-10 text-[#ecf1ed]">
    <meta name="referrer" content="no-referrer" />
    <meta name="robots" content="noindex,nofollow" />
    <div className="w-full max-w-[440px] rounded-2xl border border-[#283332] bg-[#13191a] p-6 shadow-xl sm:p-8">
      <a href="/" className="mx-auto block max-w-[260px]"><img src="/assets/c8aca.png" alt="Russell Wealth — Home" className="w-full" /></a>
      <h1 className="mt-7 text-center text-3xl font-medium tracking-tight">{step === 'request' ? 'Forgot password?' : step === 'sent' ? 'Check your email' : step === 'confirm' ? 'Reset your password' : 'Password updated'}</h1>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-900 p-3 text-sm text-red-300">{error}</p>}
      {step === 'request' && <form onSubmit={requestLink} className="mt-6 space-y-5">
        <p className="text-sm leading-6 text-[#a8b6ad]">Enter the email associated with your account. We’ll email you a link to choose a new password.</p>
        <label className="block text-sm">Account email<input className={input} type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <button className={button} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>}
      {step === 'sent' && <div role="status" className="mt-6 space-y-5 text-sm leading-6 text-[#a8b6ad]">
        <p>If an account exists for <strong className="break-all text-[#ecf1ed]">{email}</strong>, a password reset link will be sent. Check your inbox and spam folder.</p>
        <p>The link expires in 10 minutes and can be used once.</p>
        <button type="button" className="text-[#c2edce] underline" onClick={()=>{setStep('request');setError('');}}>Use another email or request a new link</button>
      </div>}
      {step === 'confirm' && <form onSubmit={resetPassword} className="mt-6 space-y-5">
        <p className="text-sm leading-6 text-[#a8b6ad]">Choose a new password for <span className="break-all">{email}</span>. Use 7–128 characters.</p>
        <label className="block text-sm">New password<input className={input} type="password" required minLength={7} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <label className="block text-sm">Confirm new password<input className={input} type="password" required minLength={7} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>
        <button className={button} disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</button>
        <button type="button" className="w-full text-sm text-[#a8b6ad] underline" onClick={()=>{setStep('request');setError('');}}>Expired link? Request a new one</button>
      </form>}
      {step === 'done' && <div role="status" className="mt-6 space-y-5 text-center"><p className="text-sm leading-6 text-[#a8b6ad]">Your password has been updated. Existing sessions have been signed out. Sign in with your new password.</p><a className={button} href="/login">Return to sign in</a></div>}
      {step !== 'done' && <a href="/login" className="mt-7 block text-center text-sm text-[#a8b6ad] underline">Back to sign in</a>}
    </div>
  </main>;
}
