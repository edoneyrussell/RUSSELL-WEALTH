import { useState } from "react";

type Props = {
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
};

const domains: Record<string, string> = {
  AAPL: "apple.com",
  NVDA: "nvidia.com",
  MSFT: "microsoft.com",
  TSLA: "tesla.com",
  GOOGL: "google.com",
  GOOG: "google.com",
  AMZN: "amazon.com",
  META: "meta.com",
  NFLX: "netflix.com",
  AMD: "amd.com",
  INTC: "intel.com",
  IBM: "ibm.com",
  ORCL: "oracle.com",
  CRM: "salesforce.com",
  ADBE: "adobe.com",
  SHOP: "shopify.com",
  CLS: "celestica.com",
  RY: "rbc.com",
  TD: "td.com",
  BNS: "scotiabank.com",
  BMO: "bmo.com",
  CM: "cibc.com",
  ENB: "enbridge.com",
  CNQ: "cnrl.com",
  SU: "suncor.com",
  BCE: "bce.ca",
  T: "telus.com",
  CNR: "cn.ca",
  CP: "cpr.ca",
  VDY: "vanguard.ca",
  VFV: "vanguard.ca",
  VOO: "vanguard.com",
  VTI: "vanguard.com",
  XEQT: "blackrock.com",
  XGRO: "blackrock.com",
  XEG: "blackrock.com",
  XRE: "blackrock.com",
  XBB: "blackrock.com",
  ZRE: "bmo.com",
  ZAG: "bmo.com",
  BTC: "bitcoin.org",
  ETH: "ethereum.org",
};

export default function AssetLogo({
  symbol,
  name,
  size = 36,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const clean = symbol.trim().toUpperCase().replace(/\.(TO|V|NE)$/, "");
  const domain = domains[clean];
  const initials = clean.slice(0, 3) || "?";

  return (
    <span
      title={name || symbol}
      aria-label={`${name || symbol} logo`}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#34404D] bg-[#202A35] text-[#D6E0EB] ${className}`}
      style={{ width: size, height: size }}
    >
      {domain && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-[75%] w-[75%] object-contain"
        />
      ) : (
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: Math.max(9, size * 0.27) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
