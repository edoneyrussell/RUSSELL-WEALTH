/** Warm route code only. Never mount hidden pages or prefetch private balances. */
export const welcomeScreenLoaders = {
  Dashboard:()=>import('../screens/Dashboard'),
  Accounts:()=>import('../screens/Accounts'),
  DemoBanking:()=>import('../screens/DemoBanking'),
  Portfolio:()=>import('../screens/PortfolioExperience'),
  Markets:()=>import('../screens/TradeExplore'),
  Transactions:()=>import('../screens/Transactions'),
  CustomerSettings:()=>import('../screens/CustomerSettings'),
};
let preparation:Promise<PromiseSettledResult<unknown>[]>|undefined;
export function prepareWelcomeScreens() {
  return preparation??=Promise.allSettled(Object.values(welcomeScreenLoaders).map(load=>load()));
}
