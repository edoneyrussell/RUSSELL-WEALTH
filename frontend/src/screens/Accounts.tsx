import { useState } from 'react';
import { useAccounts, type CustomerAccount } from '../hooks/useAccounts';
const money=(value:string)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(value));
const modeName=(mode:string)=>mode==='SELF_DIRECTED'?'Self-directed':mode==='MANAGED'?'Managed':'Savings / cash';
const field='mt-2 w-full rounded-xl border border-[#40516A] bg-[#111B28] p-3 text-white';
export default function Accounts(){
  const accounts=useAccounts();
  const [type,setType]=useState('TFSA'),[mode,setMode]=useState('SELF_DIRECTED'),[name,setName]=useState('');
  const [editing,setEditing]=useState<CustomerAccount|null>(null),[editName,setEditName]=useState('');
  const [from,setFrom]=useState(''),[to,setTo]=useState(''),[amount,setAmount]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID()),[message,setMessage]=useState('');
  const kind=accounts.types.find(item=>item.code===type);
  const open=accounts.accounts.filter(item=>item.status==='OPEN');
  const transfer=async()=>{if(await accounts.mutate('/api/customer/accounts/transfer','POST',{from_account_id:Number(from),to_account_id:Number(to),amount,request_id:requestId})){setMessage('Cash transferred between your accounts.');setAmount('');setRequestId(crypto.randomUUID());}};
  return <main className="min-h-screen bg-[#090D13] px-4 py-8 text-[#F0F3F7] sm:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header><p className="text-xs uppercase tracking-widest text-[#91ABC8]">Russell Wealth</p><h1 className="mt-2 font-['Lora'] text-4xl">Accounts</h1><p className="mt-3 text-sm text-[#A6B5C8]">Open accounts, choose where to invest, and manage separate balances.</p></header>
      <div className="rounded-2xl border border-[#38465A] bg-[#151F2D] p-5"><p className="text-xs leading-6 text-[#B5C5D9]">Simulated accounts · All balances are in CAD. Account types and joint labels organize your simulated money; they do not create a registered plan, shared legal ownership, tax benefits or real banking services. Managed accounts do not automatically invest. Interest, grants, staking, margin borrowing and payment cards are not enabled.</p></div>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs text-[#91ABC8]">TOTAL ACROSS ACCOUNTS</p><p className="mt-2 text-3xl font-semibold">{money(accounts.total_value)}</p></div><a href="/deposit" className="rounded-xl bg-[#CCDFEF] px-5 py-3 text-sm font-semibold text-[#101A26]">Add funds</a></div>
      {accounts.error&&<p role="alert" className="rounded-xl border border-amber-600/50 p-4 text-sm text-amber-200">{accounts.error}</p>}
      {message&&<p role="status" className="text-sm text-emerald-200">{message}</p>}
      <section aria-label="Your accounts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.loading?<p>Loading accounts…</p>:accounts.accounts.map(account=><article key={account.id} className="rounded-2xl border border-[#34445A] bg-[#111B28] p-5">
          <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-[#91ABC8]">{account.account_type.replaceAll('_',' ')} · {account.status==='OPEN'?modeName(account.management_mode):'Closed'}</p><h2 className="mt-2 text-xl font-semibold">{account.name}</h2></div>{account.id===accounts.selected_account_id&&<span className="rounded-lg bg-[#2A493F] px-2 py-1 text-xs text-emerald-200">Selected</span>}</div>
          <p className="mt-5 text-2xl">{money(account.total_value)}</p><p className="mt-2 text-xs text-[#9FB2CC]">Cash {money(account.cash_balance)} · Invested {money(account.invested_value)}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs"><button disabled={accounts.saving} className="underline disabled:opacity-50" onClick={()=>{setEditing(account);setEditName(account.name);}}>Manage</button>{account.status==='OPEN'&&<button disabled={accounts.saving||account.id===accounts.selected_account_id} className="text-[#BBD8FA] underline disabled:opacity-50" onClick={()=>void accounts.select(account.id)}>Use this account</button>}</div>
          {editing?.id===account.id&&<form className="mt-4 border-t border-[#34445A] pt-4" onSubmit={async event=>{event.preventDefault();if(await accounts.mutate(`/api/customer/accounts/${account.id}`,'PATCH',{name:editName})){setEditing(null);setMessage('Account name updated.');}}}><label className="text-xs">Account name<input required maxLength={80} className={field} value={editName} onChange={event=>setEditName(event.target.value)}/></label><div className="mt-3 flex flex-wrap gap-3"><button disabled={accounts.saving} type="submit" className="rounded-lg bg-[#CFDFEE] px-3 py-2 text-xs text-[#101A26]">Save name</button><button disabled={accounts.saving} type="button" onClick={async()=>{if(await accounts.mutate(`/api/customer/accounts/${account.id}`,'PATCH',{status:account.status==='OPEN'?'CLOSED':'OPEN'})){setEditing(null);setMessage(account.status==='OPEN'?'Empty account closed.':'Account reopened.');}}} className="text-xs underline">{account.status==='OPEN'?'Close empty account':'Reopen account'}</button><button type="button" onClick={()=>setEditing(null)} className="text-xs underline">Cancel</button></div></form>}
        </article>)}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <form aria-label="Open an account" className="rounded-2xl border border-[#34445A] bg-[#111B28] p-5" onSubmit={async event=>{event.preventDefault();if(await accounts.mutate('/api/customer/accounts','POST',{account_type:type,management_mode:mode,name:name.trim()||kind?.name})){setName('');setMessage('Account opened. You can now select it and add funds.');}}}>
          <h2 className="text-2xl font-semibold">Open an account</h2><label className="mt-5 block text-sm">Account type<select className={field} value={type} onChange={event=>{setType(event.target.value);setMode(accounts.types.find(t=>t.code===event.target.value)?.modes[0]??'SELF_DIRECTED');}}>{['Registered','Investing','Banking','Business'].map(category=><optgroup key={category} label={category}>{accounts.types.filter(t=>t.category===category).map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</optgroup>)}</select></label>
          <p className="mt-2 text-xs text-[#9FB2CC]">{kind?.description}</p><label className="mt-4 block text-sm">Management option<select className={field} value={mode} onChange={event=>setMode(event.target.value)}>{kind?.modes.map(option=><option key={option} value={option}>{modeName(option)}</option>)}</select></label>
          <label className="mt-4 block text-sm">Account nickname (optional)<input maxLength={80} className={field} value={name} onChange={event=>setName(event.target.value)} placeholder={kind?.name}/></label><button disabled={accounts.saving||accounts.loading} className="mt-5 rounded-xl bg-[#CFDFEE] px-5 py-3 text-sm font-semibold text-[#101A26] disabled:opacity-50">{accounts.saving?'Saving…':'Open account'}</button>
        </form>
        <form aria-label="Move cash between accounts" className="rounded-2xl border border-[#34445A] bg-[#111B28] p-5" onSubmit={event=>{event.preventDefault();void transfer();}}>
          <h2 className="text-2xl font-semibold">Move cash between accounts</h2><p className="mt-3 text-xs text-[#9FB2CC]">Move available simulated cash. Holdings stay in the account where they were purchased.</p>
          <label className="mt-5 block text-sm">From<select required className={field} value={from} onChange={event=>{setFrom(event.target.value);setRequestId(crypto.randomUUID());}}><option value="">Choose an account</option>{open.map(a=><option key={a.id} value={a.id}>{a.name} · {money(a.cash_balance)} cash</option>)}</select></label>
          <label className="mt-4 block text-sm">To<select required className={field} value={to} onChange={event=>{setTo(event.target.value);setRequestId(crypto.randomUUID());}}><option value="">Choose an account</option>{open.filter(a=>String(a.id)!==from).map(a=><option key={a.id} value={a.id}>{a.name} · {a.account_type.replaceAll('_',' ')}</option>)}</select></label>
          <label className="mt-4 block text-sm">Amount (CAD)<input required type="number" min="0.01" step="0.01" className={field} value={amount} onChange={event=>{setAmount(event.target.value);setRequestId(crypto.randomUUID());}}/></label><button disabled={accounts.saving||open.length<2} className="mt-5 rounded-xl bg-[#CFDFEE] px-5 py-3 text-sm font-semibold text-[#101A26] disabled:opacity-50">Move cash</button>
        </form>
      </div>
    </div>
  </main>;
}
