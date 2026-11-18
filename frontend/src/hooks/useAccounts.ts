import { useRemoteData } from '../experience/useRemoteData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCustomerFetch } from '../demo/customerDemo';
import { notifyPortfolioUpdated, subscribePortfolioUpdates } from '../utils/portfolioSync';
export type CustomerAccount = {id:number; name:string; account_type:string; management_mode:string; status:'OPEN'|'CLOSED'; currency:string; cash_balance:string; invested_value:string; total_value:string};
export type AccountType = {code:string;name:string;description:string;modes:string[];category:string};
export type AccountsData = {accounts:CustomerAccount[];types:AccountType[];selected_account_id:number|null;total_value:string};
export function useAccounts() {
  const customerFetch = useCustomerFetch();
  const {data:snapshot,loading,error:loadError,refresh,updatedAt}=useRemoteData<AccountsData>('/api/customer/accounts',customerFetch,{validate:value=>Array.isArray(value?.accounts)&&Array.isArray(value?.types)});
  const data=snapshot??{accounts:[],types:[],selected_account_id:null,total_value:'0'};
  const [error,setError]=useState(''),[saving,setSaving]=useState(false);
  const mutation=useRef(false);
  useEffect(()=>subscribePortfolioUpdates(()=>{void refresh();},30000,false),[refresh]);
  const mutate=useCallback(async(path:string,method:string,body:unknown)=>{
    if(mutation.current)return false;
    mutation.current=true;setSaving(true);setError('');
    try{
      const response=await customerFetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Unable to update this account.');
      notifyPortfolioUpdated();return true;
    }catch(err){setError(err instanceof Error?err.message:'Account update failed.');return false;}
    finally{mutation.current=false;setSaving(false);}
  },[customerFetch]);
  return {...data,loading,error:error||loadError,saving,refresh,updatedAt,mutate,select:(account_id:number)=>mutate('/api/customer/accounts/selection','PUT',{account_id})};
}
