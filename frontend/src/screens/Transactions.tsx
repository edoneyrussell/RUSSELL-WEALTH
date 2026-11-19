import EmptyState, { emptyActionClass } from '../components/EmptyState';
import { Skeleton, DataStatus } from '../experience/Feedback';
import { useViewState } from '../experience/ViewState';
import { getLocale } from '../i18n/language.ts';
import AccountSelector from '../components/AccountSelector';
import type { AccountScope } from '../hooks/usePortfolio';
import { useTransactions } from '../hooks/useTransactions';
import { useState } from 'react';
import { groupTransactions } from '../utils/transactionGroups';
import { ChevronDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const money = (value: string | number) =>
  new Intl.NumberFormat(getLocale(), {
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
  account_id?: number;
  account_name?: string;
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
  const [accountScope, setAccountScope] = useViewState<AccountScope>('transactions:account','all');
  const search = new URLSearchParams(window.location.search).get('search')?.toLowerCase() ?? '';
  const pageKey=String(accountScope)+':'+search;
  const [pageState,setPageState]=useState({key:pageKey,page:1});
  const page=pageState.key===pageKey?pageState.page:1;
  const { transactions, pagination, loading, error, errorMessage, refresh, updatedAt } = useTransactions(accountScope,page,search);
  const entries = transactions as HistoryEntry[];
  const groups = groupTransactions(entries);

  return (
    <div className="rw-fintech-workspace rw-fintech-transactions min-h-screen bg-[#08090a] px-5 py-10 text-[#f5f5f5] md:px-12">
      {search && <p className="mb-5 text-sm text-[#B8C6D5]">Transactions matching “{search}” · <a className="underline" href="/transactions">Show all transactions</a></p>}
      <div className="mx-auto max-w-[1200px]">
        <header data-tour="transactions" className="mb-8">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/dashboard');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="mb-6 text-sm text-[#b4b8c0] hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-['Lora'] text-3xl font-normal">Transaction History</h1>
            <AccountSelector compact label="Transaction history account" scope={accountScope} onScopeChange={setAccountScope} />
          </div>
          <p className="mt-2 text-sm text-[#8c929c]">
            Your complete simulated banking and investment activity
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-[#30343b] bg-[#14171c]">
          <DataStatus error={errorMessage} updatedAt={updatedAt} onRetry={()=>void refresh()}/>
          {loading ? (
            <Skeleton rows={4}/>
          ) : error && entries.length === 0 ? (
            <p className="p-8 text-[#f09a9a]">
              Unable to load transaction history.
            </p>
          ) : entries.length === 0 ? (
            <EmptyState title={search ? 'No transactions match your search' : 'No transactions yet'}
              description={search ? 'Try another search or view your complete transaction history.' : 'Your simulated trades, deposits, and withdrawals will appear here. Choose All accounts to include activity across your accounts.'}>
              {search ? <a className={emptyActionClass} href="/transactions">Show all transactions</a> : <>
                <a className={emptyActionClass} href="/deposit">Add funds</a>
                <a className={emptyActionClass} href="/markets">Explore markets</a>
              </>}
            </EmptyState>
          ) : (
            <div className="divide-y divide-[#30343b]">
              {groups.map(group => {
                const entry = group.entries[0];
                const multiple = group.entries.length > 1;
                const incoming =
                  entry.action === 'DEPOSIT' || entry.action === 'SELL';
                const isTrade = entry.action === 'BUY' || entry.action === 'SELL';

                const row = (
                  <div
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
                        {entry.account_name ? ` · ${entry.account_name}` : ''}
                        {isTrade && entry.quantity
                          ? multiple ? ` · ${group.quantity} ${entry.category === 'CRYPTO' ? 'units' : 'shares'} · ${group.entries.length} transactions` : ` · ${entry.quantity} ${entry.category === 'CRYPTO' ? 'units' : 'shares'} at ${money(entry.price ?? 0)}`
                          : ''}
                      </p>

                      <p className="mt-1 text-xs text-[#71808e]">
                        {new Date(entry.created_at).toLocaleString(getLocale())}
                      </p>
                    </div>

                    {multiple && <ChevronDown aria-hidden="true" size={18} className="shrink-0 transition-transform group-open:rotate-180" />}
                    <div className="flex shrink-0 items-center gap-2">
                      {incoming
                        ? <ArrowDownLeft size={17} className="text-[#39e58c]" />
                        : <ArrowUpRight size={17} className="text-[#f1b46b]" />}
                      <span className={`font-semibold ${
                        incoming ? 'text-[#39e58c]' : 'text-[#f1b46b]'
                      }`}>
                        {incoming ? '+' : '−'}{money(multiple ? group.total : entry.total)}
                      </span>
                    </div>
                  </div>
                );
                return multiple ? <details key={group.key} className="group">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden" aria-label={`${entry.action} ${entry.symbol}: ${group.entries.length} transactions`}>{row}</summary>
                  <div className="space-y-3 border-t border-[#30343b] bg-[#101419] px-6 py-4 sm:pl-24">
                    {group.entries.map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 text-xs text-[#b4b8c0]">
                      <span>{new Date(item.created_at).toLocaleString(getLocale())} · {item.quantity} {item.category === 'CRYPTO' ? 'units' : 'shares'} at {money(item.price ?? 0)}</span>
                      <span>{money(item.total)}</span>
                    </div>)}
                  </div>
                </details> : <div key={group.key}>{row}</div>;
              })}
            </div>
          )}
        </section>

        {pagination && pagination.total_pages>1 && <nav aria-label="Transaction pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" disabled={loading||page<=1} onClick={()=>setPageState({key:pageKey,page:page-1})} className="min-h-11 rounded-full border border-[#34483b] px-5 disabled:opacity-40">Previous</button>
          <span>{page} / {pagination.total_pages} · {pagination.total} transactions</span>
          <button type="button" disabled={loading||page>=pagination.total_pages} onClick={()=>setPageState({key:pageKey,page:page+1})} className="min-h-11 rounded-full border border-[#34483b] px-5 disabled:opacity-40">Next</button>
          <p className="w-full text-xs text-[#91a498]">Grouped trades reflect this page.</p>
        </nav>}
        <p className="mt-4 text-xs text-[#8c929c]">
          Simulated transactions only. No real money or securities.
        </p>
      </div>
    </div>
  );
}
