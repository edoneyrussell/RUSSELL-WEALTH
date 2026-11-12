import { useState, type FormEvent } from "react";

type Props = { mobile?: boolean };

export default function RegistrationForm({ mobile = false }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (password.length < 12) {
      setError("Use a password with at least 12 characters");
      return;
    }
    if (!agreed) {
      setError("You must accept the agreement to continue");
      return;
    }
    setBusy(true);
    try {
      await post("/api/register/start", {
        firstName, lastName, email, password
      });
      setPassword("");
      setConfirm("");
      setStep("verify");
      setMessage("Check your email for your six-digit verification code.");
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
      setStep("done");
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
             "Your email has been verified successfully"}
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-lg border border-red-700 p-3 text-sm text-red-300">
              {error}
            </p>
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
                <input className={inputClass + " mt-2"} type="password"
                  placeholder="Password" autoComplete="new-password"
                  required minLength={12} maxLength={128}
                  value={password} onChange={e => setPassword(e.target.value)} />
                <span className="mt-2 block leading-4 text-[#8c929c]">
                  Use at least 12 characters.
                </span>
              </label>

              <label className="text-xs text-[#f5f5f5]">
                Confirm Password
                <input className={inputClass + " mt-2"} type="password"
                  placeholder="Confirm Password" autoComplete="new-password"
                  required value={confirm} onChange={e => setConfirm(e.target.value)} />
              </label>

              <label className="flex items-start gap-3 text-xs leading-5 text-[#b4b8c0]">
                <input type="checkbox" className="mt-1 accent-[#c5cad2]"
                  checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span>
                  I agree to the Terms &amp; Conditions and Privacy Policy,
                  and confirm that I am at least 18 years old.
                </span>
              </label>

              <div className="mt-2 flex justify-center">
                <button className={buttonClass} type="submit" disabled={busy}>
                  {busy ? "Sending Code..." : "Create Account →"}
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
