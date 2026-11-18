import type { AccountScope } from './usePortfolio';
import { useCustomerFetch } from '../demo/customerDemo';
import { useEffect } from 'react';
import { useRemoteData } from '../experience/useRemoteData';
import { subscribePortfolioUpdates } from '../utils/portfolioSync';

export type Transaction = {
  id: string | number;
  symbol: string;
  name: string;
  action: string;
  quantity: string | null;
  price: string | null;
  total: string;
  created_at: string;
  category?: string;
  bank_code?: string | null;
  account_id?: number;
  account_name?: string;
};

export function useTransactions(scope?: AccountScope, page=1, search='', perPage=50) {
  const customerFetch = useCustomerFetch();
  const result=useRemoteData<{transactions:Transaction[];pagination?:{page:number;per_page:number;total:number;total_pages:number}}>('/api/customer/transactions?'+new URLSearchParams({page:String(page),per_page:String(perPage),...(scope===undefined?{}:{account_id:String(scope)}),...(search?{search}:{})}).toString(),customerFetch,{validate:value=>Array.isArray(value?.transactions)});
  useEffect(()=>subscribePortfolioUpdates(()=>{void result.refresh();},30000,false),[result.refresh]);
  return {pagination:result.data?.pagination,transactions:result.data?.transactions??[],loading:result.loading,error:Boolean(result.error),errorMessage:result.error,refresh:result.refresh,updatedAt:result.updatedAt};
}
