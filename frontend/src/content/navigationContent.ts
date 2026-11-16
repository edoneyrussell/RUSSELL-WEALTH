// Desktop and mobile menus use these same labels, destinations, and entries.
export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  action?: 'Alerts' | 'Logs';
};

export const customerNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '50fa9.svg' },
  { label: 'Accounts', href: '/accounts', icon: 'accounts-wallet.svg' },
  { label: 'Portfolio', href: '/portfolio', icon: '70fb9.svg' },
  { label: 'Trade', href: '/markets', icon: '74de4.svg' },
  { label: 'Watchlist', href: '/dashboard#watchlist', icon: '18ed1.svg' },
  { label: 'Transactions', href: '/transactions', icon: 'ca3db.svg' },
  { label: 'Add Funds', href: '/deposit', icon: 'add-funds-money.svg' },
];

export const customerSettings: NavigationItem = {
  label: 'Account Settings', href: '/customer/settings', icon: '⚙',
};
export const adminSettings: NavigationItem = {
  label: 'Account Settings', href: '/admin/settings', icon: '⚙',
};
export const supportNavigation: NavigationItem[] = [
  { label: 'Help & Support', href: '/help', icon: '2bd20.svg' },
];
export const securityNavigation: NavigationItem[] = [
  { label: 'SOC Dashboard', href: '/security', icon: '651b9.svg' },
  { label: 'Alerts', href: '/security', icon: '7412e.svg', action: 'Alerts' },
  { label: 'Incidents', href: '/security/incidents', icon: '82d8b.svg' },
  { label: 'Logs', href: '/security', icon: '0df54.svg', action: 'Logs' },
  { label: 'Network', href: '/security/network', icon: '8a4d1.svg' },
  { label: 'Access', href: '/security/access', icon: 'e2640.svg' },
];
