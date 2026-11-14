import { createContext, useCallback, useContext } from 'react';

export const CustomerDemoContext = createContext(false);
export const demoPortfolio = {
  account_id:1, account_type:'PERSONAL', management_mode:'SELF_DIRECTED', account_name: 'Demo Personal', currency: 'CAD', cash_balance: '8500.00', invested_value: '41500.00', total_value: '50000.00',
  holdings: [
    {symbol:'AAPL',name:'Apple Inc.',asset_type:'STOCK',quantity:'50',price:'250.00',market_value:'12500.00'},
    {symbol:'VDY',name:'Vanguard Canadian High Dividend Yield ETF',asset_type:'ETF',quantity:'200',price:'55.00',market_value:'11000.00'},
    {symbol:'XEQT.TO',name:'iShares Core Equity ETF Portfolio',asset_type:'ETF',quantity:'300',price:'35.00',market_value:'10500.00'},
    {symbol:'MSFT',name:'Microsoft Corporation',asset_type:'STOCK',quantity:'15',price:'500.00',market_value:'7500.00'},
  ],
};
const assets = demoPortfolio.holdings.map(holding => ({...holding, type:holding.asset_type, currency:'CAD', provider:'Fictional demo price', price_type:'SIMULATED'}));
export function customerDemoResponse(input: string, init?: RequestInit): Response {
  if (init?.method && init.method.toUpperCase() !== 'GET') return Response.json({error:'Read-only demo: trading, transfers, and account changes are disabled.'},{status:403});
  const url = new URL(input,'https://demo.invalid');
  const path = url.pathname;
  let data: unknown;
  if (input.startsWith('https://open.er-api.com/')) data = {rates:{USD:0.73}};
  else if (path === '/api/me') data = {authenticated:true,name:'Demo Investor',email:'investor@example.com',role:'CUSTOMER',profile_photo:null};
  else if (path === '/api/me/market-clock') data={exchange_code:'TSX'};
  else if (path === '/api/customer/watchlist') data = {symbols:['AAPL','MSFT','VDY'],items:assets.filter(a=>['AAPL','MSFT','VDY'].includes(a.symbol)).map(a=>({symbol:a.symbol,name:a.name}))};
  else if (path === '/api/customer/accounts') data={accounts:[{id:1,name:'Demo Personal',account_type:'PERSONAL',management_mode:'SELF_DIRECTED',status:'OPEN',currency:'CAD',cash_balance:'8500.00',invested_value:'41500.00',total_value:'50000.00'}],selected_account_id:1,total_value:'50000.00',types:[]};
  else if (path === '/api/customer/portfolio') data = demoPortfolio;
  else if (path === '/api/customer/trading-status') data = {is_open:false,message:'Read-only demo: trading is disabled.',next_open:null,closes_at:null};
  else if (path === '/api/customer/assets') data = {assets};
  else if (path === '/api/market/search') data = {results:assets.filter(asset => `${asset.symbol} ${asset.name}`.toLowerCase().includes((url.searchParams.get('q')||'').toLowerCase())).map(asset=>({...asset,type:asset.asset_type,exchange:'DEMO'}))};
  else if (path === '/api/market/quote') { const asset=assets.find(asset=>asset.symbol===url.searchParams.get('symbol')) || assets[0]; data={...asset,price:Number(asset.price),previous_close:Number(asset.price)*0.98,reference_date:new Date(Date.now()-86400000).toISOString().slice(0,10),as_of:new Date().toISOString()}; }
  else if (path === '/api/market/history') data = {history:Array.from({length:14},(_,i)=>({date:new Date(Date.now()-(13-i)*86400000).toISOString().slice(0,10),close:240+i*.8}))};
  else if (path === '/api/customer/transactions') data = {transactions:assets.slice(0,3).map((asset,i)=>({id:i+1,symbol:asset.symbol,name:asset.name,action:'BUY',quantity:asset.quantity,price:asset.price,total:asset.market_value,created_at:'2026-11-10T15:00:00Z',category:'STOCK'}))};
  else if (path === '/api/customer/demo-banking') data = {account_id:1,account_name:'Demo Personal',account_type:'PERSONAL',simulated:true,cash_balance:'8500.00',deposit_capacity:'899950000',banks:[{code:'TD',name:'Demo Bank Account',short_name:'Demo Bank',balance:'10000.00'}],history:[]};
  else return Response.json({error:'This feature is unavailable in the read-only demo.'},{status:404});
  return Response.json(data);
}
export function useCustomerFetch() {
  const demo = useContext(CustomerDemoContext);
  return useCallback((input:string, init?:RequestInit):Promise<Response> => demo ? Promise.resolve(customerDemoResponse(input,init)) : fetch(input,init),[demo]);
}
export function customerDemoNavigate(path: string): boolean {
  if (window.location.pathname !== '/demo/customer') return false;
  window.dispatchEvent(new CustomEvent('rw-demo-customer-navigate',{detail:{path}}));
  return true;
}
