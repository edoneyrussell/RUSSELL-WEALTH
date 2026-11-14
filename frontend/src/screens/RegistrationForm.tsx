import { useState, type FormEvent } from "react";

import { Eye, EyeOff } from "lucide-react";

type Props = { mobile?: boolean };

export default function RegistrationForm({ mobile = false }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordHint, setPasswordHint] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const inputClass =
    "w-full min-w-0 h-[52px] rounded-[10px] border border-[#414650] " +
    "bg-[#101216] px-4 text-[16px] text-[#f5f5f5] " +
    "placeholder:text-[#8c929c] outline-none focus:border-[#c5cad2]";

  const buttonClass =
    "w-full max-w-[280px] rounded-full border border-[#c5cad2] " +
    "bg-gradient-to-b from-[#e3e6eb] via-[#c5cad2] to-[#9ea5af] " +
    "py-4 text-[14px] font-semibold text-[#080a0d] disabled:opacity-50";

  async function post(url: string, body: object) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed");
    return result;
  }

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 7) {
      setError("Use a password with at least 7 characters");
      return;
    }
    if (!agreed) {
      setError("You must accept the agreement to continue");
      return;
    }
    setBusy(true);
    try {
      await post("/api/register/start", {
        firstName,
        lastName,
        email,
        password,
        passwordHint,
        acceptedTerms: agreed
      });
      setPassword("");
      setConfirm("");
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/register/verify", { email, code });
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={
      "relative flex min-h-screen w-full justify-center bg-[#08090a] " +
      (mobile ? "px-5 py-10" : "px-6 py-20")
    }>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(155,120,69,0.12),transparent_65%)]" />

      <div className={
        "relative z-10 flex w-full flex-col items-center " +
        (mobile ? "max-w-[430px]" : "max-w-[560px]")
      }>
        <a href="/" className="mb-4 inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-[#414650] px-4 py-2 text-sm text-[#d5e3d9] transition hover:bg-[#18251e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2edce]">
          <span aria-hidden="true">←</span> Back to home
        </a>

        <a href="/" className="block w-full max-w-[320px]">
          <img
            src="/assets/c8aca.png"
            alt="Russell Wealth"
            className="w-full object-contain"
          />
        </a>

        <div className="mt-5 w-full rounded-[20px] border border-[#414650] bg-[#14171c] px-6 py-9 shadow-2xl sm:px-10">
          <h1 className="text-center font-['Cinzel'] text-[30px] font-bold text-[#f5f5f5]">
            {step === "form" ? "Create Account" :
             step === "verify" ? "Verify Your Email" : "Account Created"}
          </h1>
          <p className="mt-2 text-center text-[13px] text-[#b4b8c0]">
            {step === "form" ? "Begin your journey with Russell Wealth" :
             step === "verify" ? `We sent a code to ${email}` :
             "Your customer account has been created successfully"}
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-700 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {step === "form" && (
            <section aria-labelledby="simulation-notice-title" className="mt-6 rounded-xl border border-[#556b5c] bg-[#18251e] p-5 text-sm leading-6 text-[#d5e3d9]">
              <h2 id="simulation-notice-title" className="mb-2 font-semibold text-[#e4f3e8]">Before you create an account</h2>
              <p>Russell Wealth is a fictional trading and banking platform built for demonstration and learning.</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>All money, holdings, trades, deposits, and withdrawals are simulated. You cannot invest, transfer, or withdraw real money.</li>
                <li>Prices and performance may be simulated, delayed, or inaccurate and do not necessarily reflect any stock exchange or actual market activity.</li>
                <li>Russell Wealth is not a bank, brokerage, or financial institution and is not affiliated with any bank or stock exchange. Bank names and logos are used for demonstration only.</li>
                <li>Nothing on this platform is financial or investment advice. Do not enter real banking credentials, account numbers, or payment details.</li>
              </ul>
            </section>
          )}

          {step === "form" && (
            <form onSubmit={start} className="mt-7 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-[#f5f5f5]">
                  First Name
                  <input className={inputClass + " mt-2"} placeholder="First Name"
                    autoComplete="given-name" required maxLength={80}
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </label>
                <label className="text-xs text-[#f5f5f5]">
                  Last Name
                  <input className={inputClass + " mt-2"} placeholder="Last Name"
                    autoComplete="family-name" required maxLength={80}
                    value={lastName} onChange={e => setLastName(e.target.value)} />
                </label>
              </div>

              <label className="text-xs text-[#f5f5f5]">
                Email Address
                <input className={inputClass + " mt-2"} type="email"
                  placeholder="Email Address" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)} />
              </label>

              <label className="text-xs text-[#f5f5f5]">
                Password
                <div className="relative mt-2">
                <input className={inputClass + " pr-12"} type={showPassword ? "text" : "password"}
                  placeholder="Password" autoComplete="new-password"
                  required minLength={7} maxLength={128}
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-3 flex items-center text-[#b4b8c0]">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                <span className="mt-2 block leading-4 text-[#8c929c]">
                  Use at least 7 characters.
                </span>
              </label>

              <label className="text-xs text-[#f5f5f5]">
                Confirm Password
                <div className="relative mt-2">
                <input className={inputClass + " pr-12"} type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password" autoComplete="new-password"
                  required minLength={7} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} />
                <button type="button" aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showConfirm} onClick={() => setShowConfirm(value => !value)} className="absolute inset-y-0 right-3 flex items-center text-[#b4b8c0]">{showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
              </label>

              <label className="text-xs text-[#f5f5f5]">
                Password hint (optional)
                <input className={inputClass + " mt-2"} type="text"
                  placeholder="Write a reminder only you understand"
                  autoComplete="off" maxLength={200} aria-describedby="password-hint-help"
                  value={passwordHint} onChange={e => setPasswordHint(e.target.value)} />
                <span id="password-hint-help" className="mt-2 block leading-4 text-[#8c929c]">
                  Don’t enter your password. Your hint appears on sign-in after you enter your email, and in password reset emails.
                </span>
              </label>

              <label className="flex items-start gap-3 text-xs leading-5 text-[#b4b8c0]">
                <input type="checkbox" className="mt-1 accent-[#c5cad2]" required
                  checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span>
                  I understand that Russell Wealth is a demonstration platform with simulated money and activity.
                  I agree to the Terms &amp; Conditions and Privacy Policy,
                  and confirm that I am at least 18 years old.
                </span>
              </label>

              <div className="mt-2 flex justify-center">
                <button className={buttonClass} type="submit" disabled={busy}>
                  {busy ? "Creating Account..." : "Create Account →"}
                </button>
              </div>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={verify} className="mt-7 flex flex-col items-center gap-5">
              <p className="text-center text-sm text-[#b4b8c0]">{message}</p>
              <input className={inputClass + " text-center tracking-[8px]"}
                inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} required
                placeholder="000000" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
              <button type="submit" className={buttonClass} disabled={busy}>
                {busy ? "Verifying..." : "Verify Email"}
              </button>
              <button type="button" className="text-sm text-[#b4b8c0] underline"
                onClick={() => { setStep("form"); setCode(""); setError(""); }}>
                Request another code
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="mt-8 flex flex-col items-center gap-6">
              <p className="text-center text-sm text-[#b4b8c0]">
                Your Russell Wealth customer account is ready.
              </p>
              <a href="/login" className={buttonClass + " text-center"}>
                Sign In →
              </a>
            </div>
          )}

          {step === "form" && (
            <p className="mt-6 text-center text-xs text-[#b4b8c0]">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-[#f5f5f5] underline">
                Sign In
              </a>
            </p>
          )}
        </div>

        <p className="mt-7 text-center text-[11px] tracking-[2px] text-[#b4b8c0]">
          PRIVATE. SECURE. YOURS.
        </p>
        <p className="mt-3 text-center text-[11px] text-[#8c929c]">
          Fictional fintech and cybersecurity portfolio project.
        </p>
      </div>
    </div>
  );
}
