import { useTransactions } from '../hooks/useTransactions';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const money = (value: string | number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));

const bankDomains: Record<string, string> = {
  TD: 'td.com',
  RBC: 'rbcroyalbank.com',
  SCOTIA: 'scotiabank.com',
  BMO: 'bmo.com',
  CIBC: 'cibc.com',
  NBC: 'nbc.ca',
  DESJARDINS: 'desjardins.com',
  TANGERINE: 'tangerine.ca',
  SIMPLII: 'simplii.com',
  EQ: 'eqbank.ca',
  ATB: 'atb.com',
  LAURENTIAN: 'laurentianbank.ca',
};

const stockDomains: Record<string, string> = {
  AAPL: 'apple.com',
  'AAPL.US': 'apple.com',
  'AAPL.NASDAQ': 'apple.com',
  VDY: 'vanguard.ca',
  'VDY.TO': 'vanguard.ca',
  NVDA: 'nvidia.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  TSLA: 'tesla.com',
  META: 'meta.com',
  AMD: 'amd.com',
  NFLX: 'netflix.com',
  SHOP: 'shopify.com',
  CLS: 'celestica.com',
};

type HistoryEntry = {
  id: string | number;
  action: string;
  symbol: string;
  name: string;
  quantity: string | null;
  price: string | null;
  total: string;
  created_at: string;
  category?: string;
  bank_code?: string | null;
};

function TransactionLogo({ entry }: { entry: HistoryEntry }) {
  const [failed, setFailed] = useState(false);
  const isBank = entry.category === 'BANK';
  const code = entry.bank_code || entry.symbol;
  const domain = isBank
    ? bankDomains[code]
    : stockDomains[entry.symbol.toUpperCase()];

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#343d48] bg-white">
      {domain && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${entry.name} logo`}
          className="h-8 w-8 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="px-1 text-center text-[10px] font-bold text-[#263645]">
          {code.slice(0, 5)}
        </span>
      )}
    </div>
  );
}

export default function Transactions() {
  const { transactions, loading, error } = useTransactions();
  const entries = transactions as HistoryEntry[];

  return (
    <div className="min-h-screen bg-[#08090a] px-5 py-10 text-[#f5f5f5] md:px-12">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-8">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/dashboard');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="mb-6 text-sm text-[#b4b8c0] hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <h1 className="font-['Lora'] text-3xl font-normal">
            Transaction History
          </h1>
          <p className="mt-2 text-sm text-[#8c929c]">
            Your complete simulated banking and investment activity
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-[#30343b] bg-[#14171c]">
          {loading ? (
            <p className="p-8 text-[#b4b8c0]">Loading transactions...</p>
          ) : error ? (
            <p className="p-8 text-[#f09a9a]">
              Unable to load transaction history.
            </p>
          ) : entries.length === 0 ? (
            <p className="p-8 text-[#b4b8c0]">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#30343b]">
              {entries.map(entry => {
                const incoming =
                  entry.action === 'DEPOSIT' || entry.action === 'SELL';
                const isStock = entry.category === 'STOCK';

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-5 transition hover:bg-[#1b2027] sm:px-7"
                  >
                    <TransactionLogo entry={entry} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {entry.action === 'BUY' ? 'Bought' :
                           entry.action === 'SELL' ? 'Sold' :
                           entry.action === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <span className="text-sm text-[#b4b8c0]">
                          {entry.symbol}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-[#8c929c]">
                        {entry.name}
                        {isStock && entry.quantity
                          ? ` · ${entry.quantity} shares at ${money(entry.price ?? 0)}`
                          : ''}
                      </p>

                      <p className="mt-1 text-xs text-[#71808e]">
                        {entry.created_at}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {incoming
                        ? <ArrowDownLeft size={17} className="text-[#39e58c]" />
                        : <ArrowUpRight size={17} className="text-[#f1b46b]" />}
                      <span className={`font-semibold ${
                        incoming ? 'text-[#39e58c]' : 'text-[#f1b46b]'
                      }`}>
                        {incoming ? '+' : '−'}{money(entry.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-4 text-xs text-[#8c929c]">
          Simulated transactions only. No real money or securities.
        </p>
      </div>
    </div>
  );
}
