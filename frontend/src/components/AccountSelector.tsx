import { useAccounts } from '../hooks/useAccounts';
export default function AccountSelector({label='Account',disabled=false,onSelected,onSelecting}:{label?:string;disabled?:boolean;onSelected?:(id:number)=>void;onSelecting?:(id:number|null)=>void}) {
  const accounts=useAccounts();
  return <div className="min-w-0 rounded-xl border border-[#34404D] bg-[#111A24] p-3">
    <label className="block text-xs text-[#9FB0C4]">{label}
      <select aria-label={label} disabled={disabled||accounts.saving||accounts.loading} value={accounts.selected_account_id??''} onChange={async event=>{const id=Number(event.target.value);onSelecting?.(id);if(await accounts.select(id))onSelected?.(id);else onSelecting?.(null);}} className="mt-2 w-full min-w-0 rounded-lg border border-[#40516A] bg-[#172332] p-2 text-sm text-white">
        {!accounts.accounts.length&&<option value="">{accounts.loading?'Loading accounts…':'No accounts available'}</option>}
        {accounts.accounts.filter(a=>a.status==='OPEN').map(account=><option key={account.id} value={account.id}>{account.name} · {account.account_type.replaceAll('_',' ')} · ${Number(account.cash_balance).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})} cash</option>)}
      </select>
    </label>
    {accounts.error&&<p role="alert" className="mt-2 text-xs text-amber-200">{accounts.error}</p>}
    <a className="mt-2 inline-block text-xs text-[#AFC9E8] underline" href="/accounts">Open or manage accounts</a>
  </div>;
}
