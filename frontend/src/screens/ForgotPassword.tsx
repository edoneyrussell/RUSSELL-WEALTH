import { useState, type FormEvent } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(url: string, payload: object) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed");
  }

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await send("/api/password-reset/request", { email });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await send("/api/password-reset/confirm", { email, code, password });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-[#555b64] bg-[#10151a] px-4 py-4 text-white outline-none focus:border-[#d4d7dd]";
  const button = "w-full rounded-xl bg-gradient-to-b from-[#f4f5f6] to-[#9298a1] px-5 py-4 font-semibold text-[#11151a] disabled:opacity-50";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090d11] px-5 py-10 text-white">
      <div className="w-full max-w-[440px] rounded-2xl border border-[#414650] bg-[#14191f] p-7 shadow-2xl">
        <a href="/" className="mx-auto block max-w-[260px]">
          <img src="/assets/c8aca.png" alt="Russell Wealth — Home" className="w-full" />
        </a>

        <h1 className="mt-8 text-center font-['Lora'] text-3xl">
          {step === "request" ? "Forgot Password" : step === "confirm" ? "Reset Password" : "Password Updated"}
        </h1>

        {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}

        {step === "request" && (
          <form onSubmit={requestCode} className="mt-7 space-y-5">
            <p className="text-sm text-[#b9bdc4]">Enter your account email to request a six-digit reset code.</p>
            <input className={input} type="email" required placeholder="Email Address"
              autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            <button className={button} disabled={busy}>{busy ? "Sending..." : "Send Reset Code"}</button>
          </form>
        )}

        {step === "confirm" && (
          <form onSubmit={resetPassword} className="mt-7 space-y-5">
            <p className="text-sm text-[#b9bdc4]">
              If an account exists for {email}, a reset code has been sent.
            </p>
            <input className={input} required inputMode="numeric" pattern="[0-9]{6}"
              maxLength={6} placeholder="Six-Digit Code" autoComplete="one-time-code"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
            <input className={input} type="password" required minLength={12}
              placeholder="New Password" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <input className={input} type="password" required minLength={12}
              placeholder="Confirm New Password" autoComplete="new-password"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
            <button className={button} disabled={busy}>{busy ? "Updating..." : "Reset Password"}</button>
            <button type="button" className="w-full text-sm text-[#b9bdc4] underline"
              onClick={() => { setStep("request"); setError(""); }}>
              Request another code
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="mt-7 space-y-5 text-center">
            <p className="text-[#b9bdc4]">Your password has been changed. You can now sign in.</p>
            <a className={button + " block"} href="/login">Return to Sign In</a>
          </div>
        )}

        <a href="/login" className="mt-7 block text-center text-sm text-[#b9bdc4] underline">
          Back to Sign In
        </a>
      </div>
    </main>
  );
}
