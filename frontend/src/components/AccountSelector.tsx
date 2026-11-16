import { getLocale } from '../i18n/language.ts';
import { useAccounts } from '../hooks/useAccounts';
import type { AccountScope } from '../hooks/usePortfolio';
import { ChevronDown } from 'lucide-react';
export default function AccountSelector({label='Account',disabled=false,onSelected,onSelecting,compact=false,accountName,scope,onScopeChange}:{label?:string;disabled?:boolean;onSelected?:(id:number)=>void;onSelecting?:(id:number|null)=>void;compact?:boolean;accountName?:string;scope?:AccountScope;onScopeChange?:(scope:AccountScope)=>void}) {
  const accounts=useAccounts();
  if (compact) return <div className="min-w-0 max-w-full">
    <div className="relative inline-flex max-w-full items-center">
      <select
        aria-label={label}
        disabled={disabled || accounts.saving || accounts.loading}
        value={scope ?? accounts.selected_account_id ?? ''}
        onChange={async event => {
          if (onScopeChange) {
            if (event.target.value === 'all') onScopeChange('all');
            else {
              const id = Number(event.target.value);
              if (await accounts.select(id)) onScopeChange(id);
            }
            return;
          }
          const id = Number(event.target.value);
          onSelecting?.(id);
          if (await accounts.select(id)) onSelected?.(id);
          else onSelecting?.(null);
        }}
        className="rw-account-switcher max-w-full cursor-pointer appearance-none truncate rounded-full border border-[#3b5547] bg-[#253b32] py-1.5 pl-3 pr-8 text-[11px] text-[#c7e2d3] outline-none hover:border-[#a4cfb5] focus-visible:ring-2 focus-visible:ring-[#a4cfb5] disabled:cursor-wait disabled:opacity-60"
      >
        {onScopeChange && <option value="all">All accounts</option>}
        {!onScopeChange && accounts.selected_account_id === null && <option value="">{accountName || (accounts.loading ? 'Loading accounts…' : 'Select account')}</option>}
        {accounts.accounts.filter(account => account.status === 'OPEN').map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
      <ChevronDown aria-hidden="true" size={13} className="pointer-events-none absolute right-3 text-[#c7e2d3]" />
    </div>
    {accounts.saving && <span role="status" className="ml-2 text-[11px] text-[#91a498]">Switching…</span>}
    {accounts.error && <p role="alert" className="mt-2 text-xs text-amber-200">{accounts.error}</p>}
  </div>;
  return <div className="rw-account-selector min-w-0 rounded-xl border border-[#283332] bg-[#13191a] p-3">
    <label className="block text-xs text-[#91a498]">{label}
      <select aria-label={label} disabled={disabled||accounts.saving||accounts.loading} value={accounts.selected_account_id??''} onChange={async event=>{const id=Number(event.target.value);onSelecting?.(id);if(await accounts.select(id))onSelected?.(id);else onSelecting?.(null);}} className="mt-2 w-full min-w-0 rounded-lg border border-[#34483b] bg-[#0f1614] p-2 text-sm text-white">
        {!accounts.accounts.length&&<option value="">{accounts.loading?'Loading accounts…':'No accounts available'}</option>}
        {accounts.accounts.filter(a=>a.status==='OPEN').map(account=><option key={account.id} value={account.id}>{account.name} · {account.account_type.replaceAll('_',' ')} · ${Number(account.cash_balance).toLocaleString(getLocale(),{minimumFractionDigits:2,maximumFractionDigits:2})} cash</option>)}
      </select>
    </label>
    {accounts.error&&<p role="alert" className="mt-2 text-xs text-amber-200">{accounts.error}</p>}
    <a className="mt-2 inline-block text-xs text-[#b4cbbd] underline" href="/accounts">Open or manage accounts</a>
  </div>;
}
