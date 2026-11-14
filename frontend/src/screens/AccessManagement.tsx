import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, Search, Users, RefreshCw, X, CalendarDays } from 'lucide-react';

type Account = {
  id: number; name: string; email: string; role: 'CUSTOMER' | 'SOC_ADMIN';
  account_status: string; created_at: string | null;
  source: string; source_label: string; manageable: boolean; is_owner?: boolean; is_self: boolean; access_role: 'CUSTOMER' | 'SOC_ADMIN' | 'BOTH';
};
type DirectorySource = { key: string; label: string; status: 'connected' | 'unavailable'; count: number | null; manageable: boolean; primary: boolean };
type Action = { user: Account; kind: 'role' | 'status' | 'delete'; value?: string };
const control = 'rounded-lg border border-[#34404D] bg-[#18232E] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40';

export default function AccessManagement() {
  const [users, setUsers] = useState<Account[]>([]);
  const [currentId, setCurrentId] = useState<number>();
  const [currentSource, setCurrentSource] = useState('');
  const [sources, setSources] = useState<DirectorySource[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!action && !selectedAccount) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = dialog.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]') ?? []);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    panel?.addEventListener('keydown', trapFocus);
    return () => { panel?.removeEventListener('keydown', trapFocus); previous?.focus(); };
  }, [action, selectedAccount]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch('/api/security/users', { credentials: 'same-origin', cache: 'no-store', signal });
      const data = await response.json().catch(() => ({ error: 'The server could not complete the request. Please try again.' }));
      if (!response.ok) throw new Error(data.error || 'Unable to load accounts');
      if (signal?.aborted) return;
      setUsers(data.users);
      setSources(data.sources);
      setCurrentId(data.current_user_id);
      setCurrentSource(data.current_source);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Unable to load accounts');
    } finally {
      inFlight.current = false;
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, []);
  useEffect(() => {
    if (action || busy) return;
    const controller = new AbortController();
    const refresh = () => { if (!document.hidden) void load(controller.signal); };
    const initial = window.setTimeout(() => void load(controller.signal), 0);
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [action, busy, load]);

  function choose(next: Action) {
    setSelectedAccount(null);
    setAction(next);
    setConfirmation('');
    setError('');
    setMessage('');
  }
  async function apply() {
    if (!action || busy) return;
    setBusy(true);
    setError('');
    try {
      const change = action.kind === 'delete' ? {}
        : action.kind === 'role' ? { role: action.value } : { account_status: action.value };
      const response = await fetch(`/api/security/users/${action.user.id}?source=${encodeURIComponent(action.user.source)}`, {
        method: action.kind === 'delete' ? 'DELETE' : 'PATCH',
        credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...change, current_password: confirmation }),
      });
      const data = await response.json().catch(() => ({ error: 'The server could not complete the request. Please try again.' }));
      if (!response.ok) throw new Error(data.error || 'Unable to update account');
      setAction(null);
      setMessage(`${data.message}: ${action.user.email}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account');
    } finally { setConfirmation(''); setBusy(false); }
  }

  const openedSearchAccount = useRef(false);
  useEffect(() => {
    if (openedSearchAccount.current || !users.length) return;
    const account = new URLSearchParams(window.location.search).get('account');
    const match = users.find(user => `${user.source}:${user.id}` === account);
    if (match) { setSelectedAccount(match); openedSearchAccount.current = true; }
  }, [users]);
  const filtered = users.filter(user => `${user.name} ${user.email} ${user.access_role} ${user.account_status} ${user.source_label}`.toLowerCase().includes(query.toLowerCase()));
  const details = selectedAccount ? users.find(user => user.source === selectedAccount.source && user.id === selectedAccount.id) ?? selectedAccount : null;
  const created = details?.created_at ? new Date(details.created_at) : null;
  const validCreated = created && !Number.isNaN(created.getTime()) ? created : null;
  const uniqueAccounts = new Set(users.map(user => user.email.toLowerCase())).size;
  const activeAdmins = new Set(users.filter(user => user.role === 'SOC_ADMIN' && user.account_status === 'ACTIVE').map(user => user.email.toLowerCase())).size;
  return (
    <main className="rw-access-management min-h-screen bg-[#090C10] p-5 text-[#F0F3F7] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#91A9BA]">RUSSELL WEALTH / SOC OPERATIONS</p>
        <div className="rw-access-heading mt-5 flex items-center gap-4">
          <div className="rounded-xl border border-[#34404D] bg-[#18232E] p-3"><ShieldCheck size={26} /></div>
          <div><h1 className="text-3xl font-semibold">Access Management</h1>
            <p className="mt-1 text-sm text-[#91A1B4]">Manage registered accounts, roles and account access.</p></div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Unique registered emails', uniqueAccounts], ['Active SOC administrators', activeAdmins],
            ['Suspended accounts', users.filter(user => user.account_status === 'SUSPENDED').length],
          ].map(([label, count]) => <div key={label} className="rounded-2xl border border-[#303B47] bg-[#121922] p-5">
            <p className="text-sm text-[#91A1B4]">{label}</p><p className="mt-2 text-3xl font-semibold">{loading ? '—' : count}</p>
          </div>)}
        </div>
        {message && <p role="status" className="mt-5 rounded-lg border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-200">{message}</p>}
        {error && !action && <p role="alert" className="mt-5 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3" aria-label="Account database connections">
          {sources.map(source => <span key={source.key} className={`rounded-lg border px-3 py-2 text-xs ${source.status === 'connected' ? 'border-[#34404D] text-[#A6BACB]' : 'border-amber-700 text-amber-200'}`}>
            {source.label}: {source.status === 'connected' ? `${source.count} account records` : 'Unavailable — list is incomplete'}

          </span>)}
          <span className="py-2 text-xs text-[#91A1B4]">Refreshes every 15 seconds{updatedAt ? ` · Updated ${updatedAt.toLocaleTimeString()}` : ''}{refreshing && !loading ? ' · Refreshing…' : ''}</span>
        </div>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[#303B47] bg-[#121922]">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Users size={20} /> User Directory</h2>
            <div className="rw-access-search flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-[#34404D] px-3 py-2"><Search size={16} className="text-[#91A1B4]" />
                <input aria-label="Search accounts" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, role or status" className="w-64 max-w-full bg-transparent text-sm outline-none" />
              </label>
              <button className={control} onClick={() => void load()} disabled={loading || refreshing || busy}><RefreshCw size={15} className="mr-2 inline" />Refresh</button>
            </div>
          </div>
          <p className="px-5 pb-5 text-sm text-[#91A1B4]">Passwords are securely hashed and cannot be viewed. Account owners can use <a className="text-[#BAD9EF] underline" href="/forgot-password">password reset</a> to choose a new password.</p>
          {loading ? <p role="status" className="p-6 text-[#91A1B4]">Loading accounts…</p> : error && !updatedAt ? <p className="p-6 text-[#91A1B4]">The directory could not be loaded. Use Refresh to try again.</p> : <>
            <div className="overflow-x-auto">
              <table className="rw-access-directory w-full text-left text-sm">
                <thead className="border-y border-[#303B47] bg-[#18212C] text-[#A6BACB]"><tr>
                  {['Account', 'Email', 'Database', 'Role', 'Status', 'Actions'].map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}
                </tr></thead>
                <tbody>{filtered.map(user => {
                  const self = user.is_self || (user.id === currentId && user.source === currentSource);
                  const sourceAdmins = users.filter(account => account.source === user.source && account.role === 'SOC_ADMIN' && account.account_status === 'ACTIVE').length;
                  const protectedAccount = !user.manageable || user.is_owner || self || (user.role === 'SOC_ADMIN' && user.account_status === 'ACTIVE' && sourceAdmins <= 1);
                  return <tr key={`${user.source}:${user.id}`} tabIndex={0}
                    onClick={event => { if (!(event.target as HTMLElement).closest('button, a, select, input, label')) setSelectedAccount(user); }}
                    onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedAccount(user); } }}
                    className={`cursor-pointer border-b border-[#303B47] last:border-0 hover:bg-[#18212C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#91A9BA] ${expandedAccount === `${user.source}:${user.id}` ? 'rw-account-expanded' : ''}`}>
                    <td className="rw-account-toggle-cell" colSpan={6}><button type="button" aria-expanded={expandedAccount === `${user.source}:${user.id}`} onClick={() => setExpandedAccount(previous => previous === `${user.source}:${user.id}` ? null : `${user.source}:${user.id}`)}>{user.name}</button></td>
                    <td data-label="Account" className="px-5 py-4"><button type="button" aria-label={`View account details for ${user.email} in ${user.source_label}`} onClick={() => setSelectedAccount(user)} className="text-left font-medium text-[#D8EAF8] hover:underline">{user.name}</button>{self && <span className="ml-2 text-xs text-[#91A1B4]">You</span>}<p className="mt-1 text-xs text-[#91A1B4]">{user.is_owner ? 'ADMIN' : `Account #${user.id}`} · View details</p></td>
                    <td data-label="Email" className="px-5 py-4">{user.email}</td>
                    <td data-label="Database" className="px-5 py-4 text-[#A6BACB]">{user.source_label}</td>
                    <td data-label="Role" className="px-5 py-4">{user.is_owner ? <span className="font-semibold text-[#BAD9EF]">ADMIN</span> : <select aria-label={`Role for ${user.email} in ${user.source_label}`} className={control} value={user.access_role} disabled={!user.manageable || user.is_owner || busy} onChange={event => choose({ user, kind: 'role', value: event.target.value })}>
                      <option value="CUSTOMER" disabled={protectedAccount}>Customer</option><option value="SOC_ADMIN" disabled={self}>SOC Administrator</option><option value="BOTH">Customer + SOC Admin</option>
                    </select>}</td>
                    <td data-label="Status" className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs ${user.account_status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-200'}`}>{user.account_status}</span></td>
                    <td data-label="Actions" className="px-5 py-4">{user.manageable ? <div className="flex gap-2">
                      <button disabled={protectedAccount || busy} className={control} onClick={() => choose({ user, kind: 'status', value: user.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{user.account_status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button>
                      <button disabled={protectedAccount || busy} className={`${control} text-red-300`} onClick={() => choose({ user, kind: 'delete' })}>Delete</button>
                    </div> : <span className="text-xs text-[#91A1B4]">Only ADMIN can change account access</span>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="p-6 text-[#91A1B4]">{users.length ? 'No accounts match your search.' : 'No registered accounts.'}</p>}
            <p className="border-t border-[#303B47] p-4 text-xs text-[#91A1B4]">{filtered.length} of {users.length} account records across {sources.filter(source => source.status === 'connected').length} databases · Matching emails appear once per database. Changes apply to the database shown on each row.  The owner account, your own access and the last active SOC administrator are protected. Only the ADMIN account can make changes, using its own password. Administrative changes are recorded in security logs.</p>
          </>}
        </section>
      </div>
      {details && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5" onClick={event => { if (event.target === event.currentTarget) setSelectedAccount(null); }} onKeyDown={event => { if (event.key === 'Escape') setSelectedAccount(null); }}>
        <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="account-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#34404D] bg-[#121922] p-6">
          <div className="flex items-center justify-between gap-4"><h2 id="account-details-title" className="text-xl font-semibold">Account Details</h2><button type="button" aria-label="Close account details" className={control} onClick={() => setSelectedAccount(null)}><X size={18} /></button></div>
          <p className="mt-4 text-lg font-medium">{details.name}</p><p className="mt-1 break-words text-sm text-[#A6BACB]">{details.email}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <div><dt className="text-[#91A1B4]">Database</dt><dd className="mt-1">{details.source_label}</dd></div>
            <div><dt className="text-[#91A1B4]">Account ID</dt><dd className="mt-1">{details.is_owner ? "ADMIN" : `#${details.id}`}</dd></div>
            <div><dt className="text-[#91A1B4]">Role</dt><dd className="mt-1">{details.is_owner ? 'ADMIN' : details.access_role === 'BOTH' ? 'Customer + SOC Admin' : details.access_role === 'SOC_ADMIN' ? 'SOC Admin' : 'Customer'}</dd></div>
            <div><dt className="text-[#91A1B4]">Status</dt><dd className="mt-1">{details.account_status}</dd></div>
          </dl>
          <section className="mt-6 rounded-xl border border-[#34404D] bg-[#18212C] p-4" aria-label="Account creation information">
            <h3 className="flex items-center gap-2 font-medium"><CalendarDays size={18} />Account created</h3>
            {validCreated ? <>
              <p className="mt-3 text-base">{new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(validCreated)}</p>
              <p className="mt-1 text-lg font-semibold"><time dateTime={details.created_at!}>{new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Regina', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' }).format(validCreated)}</time></p>
              <p className="mt-1 text-xs text-[#A6BACB]">Regina, Saskatchewan · America/Regina (UTC−06:00)</p>
              <p className="mt-3 break-all text-xs text-[#91A1B4]">Recorded timestamp (UTC): {details.created_at}</p>
            </> : <p className="mt-3 text-sm text-[#A6BACB]">The creation date was not recorded for this account.</p>}
          </section>
          <section className="mt-5 rounded-xl border border-[#34404D] p-4" aria-label="Password information"><h3 className="font-medium">Password</h3><p className="mt-2 text-sm text-[#A6BACB]">Passwords are stored as one-way hashes. The original password cannot be viewed or recovered. The account owner can use password reset to choose a new one.</p></section>
          <div className="mt-6 flex justify-end"><button className={control} onClick={() => setSelectedAccount(null)}>Close</button></div>
        </section>
      </div>}
      {action && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5" onKeyDown={event => { if (event.key === 'Escape' && !busy) setAction(null); }}>
        <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="access-confirm-title" className="w-full max-w-lg rounded-2xl border border-[#34404D] bg-[#121922] p-6">
          <h2 id="access-confirm-title" className="text-xl font-semibold">{action.kind === 'delete' ? 'Delete account?' : action.kind === 'role' ? 'Change account role?' : action.value === 'SUSPENDED' ? 'Suspend account?' : 'Reactivate account?'}</h2>
          <p className="mt-3 break-words text-sm text-[#A6BACB]">{action.user.name} · {action.user.email} · {action.user.source_label}</p>
          <p className="mt-4 text-sm text-[#A6BACB]">{action.kind === 'delete' ? 'This permanently deletes the account, its portfolio, holdings and transaction records. Security history is retained. This cannot be undone.' : action.kind === 'role' ? `Set this account to ${action.value === 'BOTH' ? 'Customer + SOC Admin, with its own customer portfolio and access to both dashboards' : action.value === 'SOC_ADMIN' ? 'SOC Administrator, with access to security operations and account administration' : 'Customer, with access to its customer account only'}. The account can sign in using its existing email and password. Role changes apply on its next sign-in.` : action.value === 'SUSPENDED' ? action.user.source === currentSource ? 'Block sign-in and existing sessions until this account is reactivated.' : 'Block new sign-ins until this account is reactivated.' : 'Allow this account to sign in again.'}</p>
          {<label className="mt-5 block text-sm">ADMIN account password<input type="password" autoFocus autoComplete="current-password" maxLength={1024} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={`${control} mt-2 w-full`} /></label>}
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <div className="mt-6 flex justify-end gap-3"><button autoFocus={action.kind !== 'delete'} disabled={busy} className={control} onClick={() => setAction(null)}>Cancel</button>
            <button disabled={busy || !confirmation} className={`${control} ${action.kind === 'delete' ? 'border-red-700 text-red-300' : 'text-emerald-300'}`} onClick={() => void apply()}>{busy ? 'Saving…' : 'Confirm'}</button></div>
        </section>
      </div>}
    </main>
  );
}
