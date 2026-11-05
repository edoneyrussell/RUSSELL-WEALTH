
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowLeftRight, ArrowDownToLine,
  ArrowUpRight, Building2, Check, ChevronRight,
  CircleCheck, CreditCard, Landmark,
  ShieldCheck, Wallet
} from "lucide-react";

type Bank = {
  code: string;
  name: string;
  short_name: string;
  balance: string;
};

type Transfer = {
  id: string;
  bank_code: string;
  direction: string;
  amount: string;
  created_at: string;
};

type BankingData = {
  simulated: boolean;
  cash_balance: string;
  banks: Bank[];
  history: Transfer[];
};

const bankStyles: Record<string, { bg: string; fg: string; text: string }> = {
  TD: { bg: "#24A32F", fg: "#FFFFFF", text: "TD" },
  RBC: { bg: "#0752A5", fg: "#F5D65B", text: "RBC" },
  SCOTIA: { bg: "#E32026", fg: "#FFFFFF", text: "S" },
  BMO: { bg: "#0664AC", fg: "#FFFFFF", text: "BMO" },
  CIBC: { bg: "#A71930", fg: "#F5D58A", text: "CIBC" },
  NBC: { bg: "#D62828", fg: "#FFFFFF", text: "NBC" },
  DESJARDINS: { bg: "#178B52", fg: "#FFFFFF", text: "D" },
  TANGERINE: { bg: "#EA7400", fg: "#FFFFFF", text: "T" },
  SIMPLII: { bg: "#D62246", fg: "#FFFFFF", text: "S" },
  EQ: { bg: "#1263B4", fg: "#FFFFFF", text: "EQ" },
  ATB: { bg: "#087E87", fg: "#FFFFFF", text: "ATB" },
  LAURENTIAN: { bg: "#274B78", fg: "#FFFFFF", text: "LB" }
};


const bankLogoDomains: Record<string, string> = {
  "TD": "td.com",
  "RBC": "rbcroyalbank.com",
  "SCOTIA": "scotiabank.com",
  "BMO": "bmo.com",
  "CIBC": "cibc.com",
  "NBC": "nbc.ca",
  "DESJARDINS": "desjardins.com",
  "TANGERINE": "tangerine.ca",
  "SIMPLII": "simplii.com",
  "EQ": "eqbank.ca",
  "ATB": "atb.com",
  "LAURENTIAN": "laurentianbank.ca"
};

function BankLogo({
  code,
  size = 48
}: {
  code: string;
  size?: number;
}) {
  const style = bankStyles[code] || {
    bg: "#25303A",
    fg: "#FFFFFF",
    text: code
  };

  const [failed, setFailed] = useState(false);
  const domain = bankLogoDomains[code];

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#FFFFFF"
      }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg"
      aria-label={`${code} bank logo`}
    >
      {!failed && domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${code} logo`}
          width={Math.round(size * .72)}
          height={Math.round(size * .72)}
          onError={() => setFailed(true)}
          className="object-contain"
        />
      ) : (
        <span
          style={{
            color: style.bg,
            fontSize: size * .23
          }}
          className="font-black tracking-tight"
        >
          {style.text}
        </span>
      )}
    </div>
  );
}

function cad(value: string | number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency", currency: "CAD"
  }).format(Number(value));
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" });
}

const panel = "rounded-2xl border border-[#29323C] bg-[#10161C] p-5 sm:p-6";
const field = "w-full rounded-xl border border-[#36414D] bg-[#151D25] px-4 py-4 text-[#F3F6F9] outline-none focus:border-[#A7C0D4]";
const secondaryButton = "rounded-xl border border-[#374451] bg-[#18212A] px-4 py-3 text-sm font-medium transition hover:border-[#A7C0D4] hover:bg-[#263544]";

export default function DemoBanking() {
  const [data, setData] = useState<BankingData | null>(null);
  const [mode, setMode] = useState<"DEPOSIT" | "WITHDRAW">(
    window.location.pathname === "/withdraw" ? "WITHDRAW" : "DEPOSIT"
  );
  const [bankCode, setBankCode] = useState("TD");
  const [amount, setAmount] = useState("1000");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/customer/demo-banking", {
      credentials: "same-origin"
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load banking");
    setData(body);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  const bank = data?.banks.find((b) => b.code === bankCode);
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    Math.round(numericAmount * 100) === numericAmount * 100 &&
    numericAmount <= (
      mode === "DEPOSIT"
        ? Number(bank?.balance ?? 0)
        : Number(data?.cash_balance ?? 0)
    );

  async function submit() {
    if (!validAmount || busy || step !== 2) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/customer/demo-banking/transfer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_code: bankCode,
          direction: mode,
          amount,
          request_id: requestId
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Transfer failed");

      setCompleted(body.transfer_id);
      await load();

      window.dispatchEvent(
        new CustomEvent("rw:portfolio-updated", {
          detail: {
            source: "demo-banking",
            direction: mode,
            amount
          }
        })
      );

      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  function reset(nextMode?: "DEPOSIT" | "WITHDRAW") {
    if (nextMode) {
      setMode(nextMode);
      navigate(nextMode === "DEPOSIT" ? "/deposit" : "/withdraw");
    }
    setStep(1);
    setCompleted("");
    setError("");
    setRequestId(crypto.randomUUID());
    setAmount("1000");
  }

  return (
    <main className="min-h-screen bg-[#090D12] px-4 py-8 text-[#F2F5F8] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header>
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-3 flex items-center gap-2 text-sm text-[#B6C4D1] hover:text-white"
          >
            <ArrowLeft size={18} /> Dashboard
          </button>
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#94A9BA]">
            Russell Wealth · Simulated Banking
          </p>
          <h1 className="mt-2 font-['Lora'] text-3xl font-semibold sm:text-4xl">
            {mode === "DEPOSIT" ? "Deposit Funds" : "Transfer & Withdraw Funds"}
          </h1>
          <p className="mt-2 text-sm text-[#9DAAB7]">
            {mode === "DEPOSIT"
              ? "Move simulated funds from a Canadian bank into your investment account."
              : "Transfer available investment cash back to your simulated bank account."}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#29323C] bg-[#111820] p-2">
          {(["DEPOSIT", "WITHDRAW"] as const).map((item) => (
            <button
              key={item}
              onClick={() => reset(item)}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-4 text-sm font-semibold transition sm:text-lg ${
                mode === item
                  ? "border border-[#A3C2D5] bg-[#20323B] text-white shadow-[0_0_25px_rgba(178,211,231,.13)]"
                  : "text-[#A1AFBD] hover:bg-[#1B252F] hover:text-white"
              }`}
            >
              {item === "DEPOSIT"
                ? <ArrowDownToLine size={22} />
                : <ArrowLeftRight size={22} />}
              {item === "DEPOSIT" ? "Deposit Funds" : "Withdraw Funds"}
            </button>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(350px,.85fr)]">
          <section id="rw-bank-transfer-form" className={`${panel} scroll-mt-6`}>
            <div className="mb-8 flex items-center justify-center gap-3 sm:gap-6">
              {["Details", "Confirm", "Complete"].map((name, i) => (
                <div key={name} className="flex items-center gap-3 sm:gap-6">
                  {i > 0 && <div className="h-px w-5 bg-[#53616E] sm:w-16" />}
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                      step >= i + 1
                        ? "border-[#B4D0E2] bg-[#D5E5EF] text-[#101820]"
                        : "border-[#394650] bg-[#222B34] text-[#A6B4C1]"
                    }`}>
                      {step > i + 1 ? <Check size={17} /> : i + 1}
                    </div>
                    <span className="text-xs text-[#C0CAD3]">{name}</span>
                  </div>
                </div>
              ))}
            </div>

            {loading && <p className="text-[#A8B8C7]">Loading simulated accounts...</p>}

            {!loading && !data && (
              <p className="text-[#E7B4B4]">
                Banking is unavailable. Check the Flask backend connection.
              </p>
            )}

            {data && step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold">
                    {mode === "DEPOSIT" ? "From (Your Bank)" : "To (Your Bank)"}
                  </label>
                  <div className="flex items-center gap-3">
                    <BankLogo code={bankCode} />
                    <select
                      value={bankCode}
                      onChange={(e) => {
                        setBankCode(e.target.value);
                        setRequestId(crypto.randomUUID());
                      }}
                      className={field}
                    >
                      {data.banks.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} — {cad(b.balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 text-xs text-[#8EA3B5]">
                    Available simulated bank balance: {cad(bank?.balance || 0)}
                  </p>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold">
                    {mode === "DEPOSIT" ? "To (Russell Wealth)" : "From (Russell Wealth)"}
                  </label>
                  <div className="flex items-center gap-4 rounded-xl border border-[#36414D] bg-[#151D25] p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#26333F] font-['Lora'] text-2xl font-bold">
                      RW
                    </div>
                    <div>
                      <p className="font-semibold">Russell Wealth Account</p>
                      <p className="text-xs text-[#A0AFBD]">
                        CAD Investment Account · Available {cad(data.cash_balance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold">
                    {mode === "DEPOSIT" ? "Deposit" : "Withdrawal"} Amount (CAD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setRequestId(crypto.randomUUID());
                      }}
                      className={`${field} pl-10 text-2xl`}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {[500, 1000, 5000, 10000].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setAmount(String(n));
                          setRequestId(crypto.randomUUID());
                        }}
                        className={`${secondaryButton} ${
                          amount === String(n)
                            ? "border-[#C5DCE9] bg-[#263845]"
                            : ""
                        }`}
                      >
                        ${n.toLocaleString("en-CA")}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setAmount("");
                        setRequestId(crypto.randomUUID());
                      }}
                      className={secondaryButton}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#36414D] bg-[#151D25] p-4">
                  <div className="flex items-center gap-3">
                    <Landmark size={22} className="text-[#B6CBD9]" />
                    <div>
                      <p className="text-sm font-semibold">Simulated Electronic Transfer</p>
                      <p className="text-xs text-[#A0AFBD]">
                        Immediate in this demo · No real money movement
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!validAmount}
                  onClick={() => { setError(""); setStep(2); }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#D3E4EE] px-5 py-4 font-semibold text-[#101820] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue to Confirm <ChevronRight size={20} />
                </button>
              </div>
            )}

            {data && step === 2 && (
              <div className="space-y-5">
                <h2 className="font-['Lora'] text-2xl">Confirm Transfer</h2>
                <div className="rounded-xl border border-[#36414D] bg-[#151D25] p-5">
                  <p className="text-sm text-[#A8B8C7]">Transfer amount</p>
                  <p className="mt-2 font-['Lora'] text-4xl">{cad(amount)}</p>
                  <div className="mt-5 space-y-3 border-t border-[#35414D] pt-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#A8B8C7]">Bank</span>
                      <span className="text-right">{bank?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8B8C7]">Direction</span>
                      <span>{mode === "DEPOSIT" ? "Bank → Russell Wealth" : "Russell Wealth → Bank"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A8B8C7]">Fees</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#B8C6D2]">
                  This action moves simulated funds between your demo accounts.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setStep(1)} className={secondaryButton}>
                    Back
                  </button>
                  <button
                    disabled={busy}
                    onClick={submit}
                    className="rounded-xl bg-[#D3E4EE] px-4 py-3 font-semibold text-[#101820] hover:bg-white disabled:opacity-50"
                  >
                    {busy ? "Processing..." : "Confirm Transfer"}
                  </button>
                </div>
              </div>
            )}

            {data && step === 3 && (
              <div className="flex flex-col items-center gap-5 py-8 text-center">
                <CircleCheck size={68} className="text-[#BBDACD]" />
                <h2 className="font-['Lora'] text-3xl">Transfer Complete</h2>
                <p className="font-['Lora'] text-4xl">{cad(amount)}</p>
                <p className="text-sm text-[#B6C5D2]">
                  Your simulated account balances have been updated.
                </p>
                <p className="max-w-full break-all text-xs text-[#75899A]">
                  Reference: {completed}
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full rounded-xl bg-[#D3E4EE] px-5 py-4 font-semibold text-[#101820] hover:bg-white"
                >
                  Return to Dashboard
                </button>
                <button onClick={() => reset()} className={secondaryButton}>
                  Make Another Transfer
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </section>

          <aside className="space-y-5">
            <section className={panel}>
              <h2 className="mb-4 flex items-center gap-3 font-['Lora'] text-xl">
                <Building2 size={22} /> Your Simulated Banks
              </h2>
              <div className="space-y-3">
                {data?.banks.map((b) => (
                  <button
                    key={b.code}
                    onClick={() => {
                      setBankCode(b.code);
                      setRequestId(crypto.randomUUID());
                      setStep(1);
                      setError("");
                      window.requestAnimationFrame(() => {
                        document.getElementById("rw-bank-transfer-form")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                          });
                      });
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#C5D8E5] ${
                      bankCode === b.code
                        ? "border-[#A5BECE] bg-[#24313C]"
                        : "border-[#35414B] bg-[#151C23]"
                    }`}
                  >
                    <BankLogo code={b.code} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-[#A9BAC7]">{cad(b.balance)} available</p>
                    </div>
                    {bankCode === b.code && <Check size={18} className="text-[#D0E3EE]" />}
                  </button>
                ))}
              </div>
              
            </section>

            <section className={panel}>
              <h2 className="mb-4 flex items-center gap-3 font-['Lora'] text-xl">
                <Wallet size={22} /> Account Overview
              </h2>
              <p className="text-sm text-[#A7B7C4]">Russell Wealth Buying Power</p>
              <p className="mt-2 font-['Lora'] text-3xl">
                {cad(data?.cash_balance ?? 0)}
              </p>
              <div className="mt-5 border-t border-[#34414C] pt-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-[#B9D2E0]" />
                  <div>
                    <p className="text-sm font-semibold">Demo Banking Environment</p>
                    <p className="text-xs text-[#A5B3C0]">
                      No real banks are connected. No real transfers occur.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className={panel}>
              <h2 className="mb-4 flex items-center gap-3 font-['Lora'] text-xl">
                <CreditCard size={21} /> Recent Transfers
              </h2>
              {!data?.history.length && (
                <p className="text-sm text-[#8EA2B3]">No simulated transfers yet.</p>
              )}
              <div className="space-y-3">
                {data?.history.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border-b border-[#2B3641] pb-3 last:border-0">
                    {t.direction === "DEPOSIT"
                      ? <ArrowDownToLine size={18} className="text-[#B9DACA]" />
                      : <ArrowUpRight size={18} className="text-[#B7CBE1]" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {t.direction === "DEPOSIT" ? "Deposit" : "Withdrawal"} · {t.bank_code}
                      </p>
                      <p className="text-xs text-[#899BAA]">{t.created_at}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      {t.direction === "DEPOSIT" ? "+" : "-"}{cad(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <footer className="border-t border-[#2B3641] pt-5 text-xs text-[#8294A3]">
          RUSSELL WEALTH · FICTIONAL FINTECH PORTFOLIO · SIMULATED FUNDS ONLY
        </footer>
      </div>
    </main>
  );
}
