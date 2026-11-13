import { useEffect, useState } from 'react';
import { LayoutDashboard, PieChart, ArrowLeftRight, Star, List, Plus, CircleHelp, Menu } from 'lucide-react';
import { CustomerDemoContext } from '../demo/customerDemo';
import Dashboard from './Dashboard';
import Portfolio from './PortfolioExperience';
import Trade from './TradeExplore';
import Watchlist from '../components/WatchlistOverlay';
import Transactions from './Transactions';
import Banking from './DemoBanking';
import Help from './HelpSupport';

const items = [
  ['Dashboard','/dashboard',LayoutDashboard],['Portfolio','/portfolio',PieChart],['Trade','/markets',ArrowLeftRight],
  ['Watchlist','/dashboard#watchlist',Star],['Transactions','/transactions',List],['Add Funds','/deposit',Plus],['Help & Support','/help',CircleHelp],
] as const;
const screens = {'/dashboard':Dashboard,'/portfolio':Portfolio,'/markets':Trade,'/dashboard#watchlist':Watchlist,'/transactions':Transactions,'/deposit':Banking,'/help':Help};
export default function CustomerDemo() {
  const [view,setView] = useState('/dashboard');
  const [menu,setMenu] = useState(false);
  const [notice,setNotice] = useState('');
  const choose = (path:string) => {setView(path in screens ? path : '/dashboard');setMenu(false);setNotice('');window.scrollTo({top:0,behavior:'instant'});};
  useEffect(()=>{
    const navigate=(event:Event)=>choose((event as CustomEvent<{path:string}>).detail.path);
    window.addEventListener('rw-demo-customer-navigate',navigate);
    return ()=>window.removeEventListener('rw-demo-customer-navigate',navigate);
  },[]);
  const Screen=screens[view as keyof typeof screens];
  return <CustomerDemoContext.Provider value={true}><div className="rw-customer-demo" onClick={event=>event.stopPropagation()} onClickCapture={event=>{
    const element=(event.target as HTMLElement).closest('a[href], button');
    if (!element || !element.closest('.rw-demo-customer-content')) return;
    if(element instanceof HTMLAnchorElement && !element.getAttribute('href')?.startsWith('#')) {
      const href=element.getAttribute('href')||'';
      if(href.startsWith('/')) {event.preventDefault();event.stopPropagation();if(href in screens) choose(href);else setNotice('This account feature is disabled in the public demo.');}
    }
    const label=element.textContent?.trim()||'';
    const map:Record<string,string>={'Search Markets':'/markets','Trade':'/markets','Trade & Explore':'/markets','Explore & Trade':'/markets','Add money':'/deposit','Deposit Funds':'/deposit','My Portfolio':'/portfolio','View Portfolio':'/portfolio','View portfolio':'/portfolio','View All':'/portfolio','← Back to Dashboard':'/dashboard','Dashboard':'/dashboard'};
    const key=Object.keys(map).find(key=>label===key || label.replace(/[↗›]/g,'').trim()===key);
    if(key){event.preventDefault();event.stopPropagation();choose(map[key]);}
    if(label==='Confirm Transfer' || /^(Buy|Sell) [A-Z]/.test(label) || /^(Add Stock|Remove)/.test(label) || element.getAttribute('aria-label')?.startsWith('Remove ')) {event.preventDefault();event.stopPropagation();setNotice('Read-only demo: trades, transfers, and account changes are disabled.');}
  }}>
    <header className="rw-demo-banner"><div><strong>DEMO</strong><span>Fictional portfolio · Read-only preview · No real trades or transfers</span></div><a href="/">← Back to home</a></header>
    <button type="button" className="rw-demo-menu" aria-label="Toggle demo navigation" aria-expanded={menu} onClick={()=>setMenu(value=>!value)}><Menu size={20}/></button>
    <div className="rw-unified-customer-layout">
      <aside className={`rw-unified-sidebar rw-demo-sidebar ${menu?'is-open':''}`}>
        <a href="/" aria-label="Russell Wealth home"><img src="/assets/c8aca.png" alt="Russell Wealth"/></a><p>YOUR DEMO ACCOUNT</p>
        <nav aria-label="Demo customer navigation">{items.map(([label,path,Icon])=><button type="button" key={path} aria-current={view===path?'page':undefined} onClick={()=>choose(path)}><Icon size={19}/>{label}</button>)}</nav>
        <div className="rw-demo-identity">Demo Investor<small>Fictional account · No sign-in required</small></div>
      </aside>
      <div className="rw-unified-customer-content rw-demo-customer-content">{notice&&<p role="status" className="rw-demo-action-notice">{notice}</p>}<div key={view} className="rw-page-transition"><Screen/></div></div>
    </div>
  </div></CustomerDemoContext.Provider>;
}
