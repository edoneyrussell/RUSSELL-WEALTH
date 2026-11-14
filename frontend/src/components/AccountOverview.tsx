import { useAccounts } from '../hooks/useAccounts';
import { customerDemoNavigate } from '../demo/customerDemo';

export default function AccountOverview({money}:{money:(value:string|number)=>string}) {
  const accounts=useAccounts();
  const open=accounts.accounts.filter(account=>account.status==='OPEN');
  const cash=open.reduce((sum,account)=>sum+Number(account.cash_balance),0);
  const invested=open.reduce((sum,account)=>sum+Number(account.invested_value),0);
  return <section aria-label="Account Overview" className="h-full min-w-0 rounded-[22px] border border-[#2B333D] bg-[#12171E] p-5 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8E9BAA]">ACCOUNT OVERVIEW</p><h2 className="mt-2 font-['Lora'] text-[25px]">Your accounts</h2></div><a href="/accounts" className="text-xs text-[#B5D4F6] underline">Manage accounts</a></div>
    {accounts.error&&<p role="alert" className="mb-4 text-xs leading-5 text-amber-200">{accounts.error}{accounts.accounts.length>0?' Last loaded balances may be out of date.':''}</p>}
    {accounts.loading?<p className="text-sm text-[#9CACBF]">Loading account balances…</p>:<>
      <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
        {open.map(account=><article key={account.id} data-overview-account={account.id} className="rounded-xl border border-[#34445A] bg-[#151F2B] p-4">
          <button type="button" disabled={accounts.saving} aria-label={`View ${account.name} portfolio`} onClick={async()=>{if(await accounts.select(account.id)){if(!customerDemoNavigate('/portfolio'))window.location.assign('/portfolio');}}} className="text-left text-sm font-semibold text-[#DFEAF7] underline decoration-[#60758F] underline-offset-4 disabled:opacity-50">{account.name}</button>
          <p className="mt-2 text-[11px] text-[#91ABC8]">{accounts.types.find(type=>type.code===account.account_type)?.name??account.account_type.replaceAll('_',' ')}{account.id===accounts.selected_account_id?' · Current portfolio':''}</p>
          <dl className="mt-4 space-y-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><dt className="text-[#9CACBF]">Available cash</dt><dd>{money(account.cash_balance)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-[#9CACBF]">Investments</dt><dd>{money(account.invested_value)}</dd></div><div className="flex flex-wrap justify-between gap-2 border-t border-[#34445A] pt-2 font-semibold"><dt>Account total</dt><dd>{money(account.total_value)}</dd></div></dl>
        </article>)}
        {!open.length&&!accounts.error&&<p className="text-sm text-[#9CACBF]">No open accounts. <a href="/accounts" className="underline">Open an account</a></p>}
      </div>
      {open.length>0&&<dl className="mt-5 space-y-3 border-t border-[#34445A] pt-4 text-xs"><div className="flex flex-wrap justify-between gap-2 text-[#A8BBD1]"><dt>Cash across accounts</dt><dd>{money(cash)}</dd></div><div className="flex flex-wrap justify-between gap-2 text-[#A8BBD1]"><dt>Investments across accounts</dt><dd>{money(invested)}</dd></div><div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><dt>Total across accounts</dt><dd>{money(accounts.total_value)}</dd></div></dl>}
    </>}
  </section>;
}
