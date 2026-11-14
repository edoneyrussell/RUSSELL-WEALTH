import { useCallback, useEffect, useRef, useState } from 'react';
import { useCustomerFetch } from '../demo/customerDemo';
import { notifyPortfolioUpdated, subscribePortfolioUpdates } from '../utils/portfolioSync';
export type CustomerAccount = {id:number; name:string; account_type:string; management_mode:string; status:'OPEN'|'CLOSED'; currency:string; cash_balance:string; invested_value:string; total_value:string};
export type AccountType = {code:string;name:string;description:string;modes:string[];category:string};
export type AccountsData = {accounts:CustomerAccount[];types:AccountType[];selected_account_id:number|null;total_value:string};
export function useAccounts() {
  const customerFetch = useCustomerFetch();
  const [data,setData] = useState<AccountsData>({accounts:[],types:[],selected_account_id:null,total_value:'0'});
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [saving,setSaving] = useState(false);
  const [revision,setRevision] = useState(0);
  const mutation = useRef(false);
  useEffect(()=>{
    const controller = new AbortController();
    let pending = false, queued = false;
    const load = async () => {
      if(pending){queued=true;return;}
      pending=true;
      try {
        const response=await customerFetch('/api/customer/accounts',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Unable to load your accounts.');
        const body=await response.json();
        if(!controller.signal.aborted){setData(body);setError('');}
      }catch(err){if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Unable to load accounts.');}
      finally{pending=false;if(!controller.signal.aborted){setLoading(false);if(queued){queued=false;void load();}}}
    };
    void load();const unsubscribe=subscribePortfolioUpdates(()=>void load());
    return()=>{controller.abort();unsubscribe();};
  },[customerFetch,revision]);
  const mutate=useCallback(async(path:string,method:string,body:unknown)=>{
    if(mutation.current)return false;
    mutation.current=true;setSaving(true);setError('');
    try{
      const response=await customerFetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Unable to update this account.');
      setRevision(value=>value+1);notifyPortfolioUpdated();return true;
    }catch(err){setError(err instanceof Error?err.message:'Account update failed.');return false;}
    finally{mutation.current=false;setSaving(false);}
  },[customerFetch]);
  return {...data,loading,error,saving,mutate,select:(account_id:number)=>mutate('/api/customer/accounts/selection','PUT',{account_id})};
}
