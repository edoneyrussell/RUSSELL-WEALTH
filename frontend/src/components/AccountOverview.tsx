import { ChevronDown } from 'lucide-react';
import { useAccounts } from '../hooks/useAccounts';
import { customerDemoNavigate } from '../demo/customerDemo';

export default function AccountOverview({money}:{money:(value:string|number)=>string}) {
  const accounts=useAccounts();
  const open=accounts.accounts.filter(account=>account.status==='OPEN');
  return <section aria-label="Account Overview" className="rw-fintech-panel min-w-0 rounded-[22px] border border-[#2B333D] bg-[#12171E] p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#91a498]">ACCOUNT OVERVIEW</p><h2 className="mt-2 font-['Lora'] text-[25px]">Your accounts</h2></div><a href="/accounts" className="text-xs text-[#b4cbbd] underline">Manage accounts</a></div>
    {accounts.error&&<p role="alert" className="mb-4 text-xs leading-5 text-amber-200">{accounts.error}{accounts.accounts.length>0?' Last loaded balances may be out of date.':''}</p>}
    {accounts.loading?<p className="text-sm text-[#91a498]">Loading account balances…</p>:<>
      <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
        {open.map(account => <details key={account.id} data-overview-account={account.id} className="rw-fintech-tile group rounded-xl border border-[#283332] bg-[#171f1c]">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 outline-none hover:bg-[#1b2822] focus-visible:ring-2 focus-visible:ring-[#8DA9C9] [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#ecf1ed]" title={account.name}>{account.name}</p>
              <p className="mt-1 truncate text-[10px] text-[#91a498]">{account.account_type.replaceAll('_', ' ')}{account.id === accounts.selected_account_id ? ' · Current' : ''}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold">{money(account.total_value)}</span>
            <ChevronDown aria-hidden="true" size={14} className="shrink-0 text-[#91a498] transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-[#283332] px-3 pb-3 pt-3">
            <p className="text-[11px] text-[#91a498]">{accounts.types.find(type => type.code === account.account_type)?.name ?? account.account_type.replaceAll('_', ' ')}</p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#91a498]">Available cash</dt><dd>{money(account.cash_balance)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-[#91a498]">Investments</dt><dd>{money(account.invested_value)}</dd></div>
            </dl>
            <button type="button" disabled={accounts.saving} aria-label={`View ${account.name} portfolio`} onClick={async () => { if (await accounts.select(account.id)) { if (!customerDemoNavigate('/portfolio')) window.location.assign(`/portfolio?account_id=${account.id}`); } }} className="mt-3 text-xs font-semibold text-[#b4cbbd] underline underline-offset-4 disabled:opacity-50">View portfolio</button>
          </div>
        </details>)}
        {!open.length&&!accounts.error&&<p className="text-sm text-[#91a498]">No open accounts. <a href="/accounts" className="underline">Open an account</a></p>}
      </div>
      {open.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#283332] pt-3 text-xs font-semibold"><span>Total across accounts</span><span>{money(accounts.total_value)}</span></div>}
    </>}
  </section>;
}
