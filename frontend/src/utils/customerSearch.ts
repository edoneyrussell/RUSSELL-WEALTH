import { t } from '../i18n/language.ts';
export type CustomerSearchResult = {key:string; title:string; detail:string; href:string; kind:string};
export const customerSearchPages: CustomerSearchResult[] = [
  ['Dashboard','Overview balance cash portfolio value','/dashboard'],
  ['Accounts','Open manage TFSA RRSP spousal FHSA RESP LIRA RRIF personal joint crypto margin chequing savings business corporate transfer balances','/accounts'],
  ['Portfolio','Your holdings investments shares positions allocation breakdown','/portfolio'],
  ['Portfolio balance history','Chart performance account value','/dashboard#portfolio-history'],
  ['Asset allocation and position breakdown','Portfolio composition weights colours holdings','/portfolio'],
  ['Trade and explore','Buy sell stock exchange markets ETF REIT bond crypto','/markets'],
  ['Watchlist','Saved favourites following current prices daily gain loss','/dashboard#watchlist'],
  ['Transactions and history','Bought sold deposits withdrawals receipts payments','/transactions'],
  ['Add or withdraw funds','Deposit bank transfer money cash funding','/deposit'],
  ['Account settings and profile','Name photo profile picture password hint edit account','/customer/settings'],
  ['Password and account security','Change update password login security','/customer/account-settings'],
  ['Account activity','Sign in login recent activity devices','/customer/activity'],
  ['Help and support','Contact assistance administrator questions','/help'],
].map(([title,detail,href]) => ({key:href+title,title,detail,href,kind:'Section'}));

export function matchCustomerResults(results: readonly CustomerSearchResult[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return results.filter(result => terms.every(term => `${result.title} ${result.detail} ${result.kind} ${t(result.title)} ${t(result.detail)} ${t(result.kind)}`.toLowerCase().includes(term)));
}
