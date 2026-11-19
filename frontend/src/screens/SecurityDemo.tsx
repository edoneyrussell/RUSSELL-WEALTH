import '../demo/security-demo.css';
import WelcomeTour from '../onboarding/WelcomeTour';
import { securityDemoSteps, securityDemoIntroduction } from '../onboarding/securityDemoSteps';
import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, TriangleAlert, ClipboardList, List, Network, UsersRound, Settings, Menu, MonitorSmartphone } from 'lucide-react';
import SecurityDashboard from './SecurityDashboard';
import Incident from './Incident';
import Infrastructure from './NetworkInfrastructure';
import Access from './AccessManagement';
import Sessions from './ActiveSessions';
import AdminSettings from './AdminSettings';
import { SecurityDemoContext } from '../demo/securityDemo';
import { demoSection, demoSecurityLink, type DemoSection } from '../demo/securityDemoNavigation';
const items=[['SOC Dashboard',LayoutDashboard],['Alerts',TriangleAlert],['Incidents',ClipboardList],['Logs',List],['Network',Network],['Access',UsersRound],['Active Sessions',MonitorSmartphone],['Admin Settings',Settings]] as const;
const modules={Incidents:Incident,Network:Infrastructure,Access,'Active Sessions':Sessions,'Admin Settings':AdminSettings};
const isDashboard=(section:string)=>['SOC Dashboard','Alerts','Logs'].includes(section);
function sectionLink(section:DemoSection){return '/demo/security'+(section==='SOC Dashboard'?'':section==='Alerts'?'?panel=alerts':section==='Logs'?'?panel=logs':'?section='+encodeURIComponent(section));}
export default function SecurityDemo(){
  const [section,setSection]=useState(()=>demoSection(location.search));
  const [menu,setMenu]=useState(false);
  const [notice,setNotice]=useState('');
  const choose=useCallback((path:string)=>{
    const target=demoSecurityLink(path);
    if(!target){setNotice('This control is unavailable in the public preview. Real account actions require sign-in.');return;}
    const next=demoSection(target.split('?')[1]??'');
    history.replaceState({},'',target);setSection(next);setMenu(false);setNotice('');
    // Existing dashboard panels switch immediately. Newly mounted dashboards read the URL.
    window.dispatchEvent(new Event(next==='Alerts'?'rw-open-security-alerts':next==='Logs'?'rw-open-security-logs':'rw-close-security-panels'));
    window.scrollTo({top:0,behavior:'instant'});
  },[]);
  useEffect(()=>{
    const update=(event:Event)=>{const panel=(event as CustomEvent<{panel:string|null}>).detail?.panel;setSection(previous=>isDashboard(previous)?(panel||'SOC Dashboard') as DemoSection:previous);};
    const navigate=(event:Event)=>choose((event as CustomEvent<{path:string}>).detail.path);
    window.addEventListener('rw-soc-active-panel',update);window.addEventListener('rw-demo-security-navigate',navigate);
    return()=>{window.removeEventListener('rw-soc-active-panel',update);window.removeEventListener('rw-demo-security-navigate',navigate);};
  },[choose]);
  const Module=modules[section as keyof typeof modules];
  return <SecurityDemoContext.Provider value={true}><div className="rw-security-demo rw-soc-theme" onClick={event=>event.stopPropagation()} onClickCapture={event=>{
    const anchor=(event.target as HTMLElement).closest('a[href]');
    if(anchor instanceof HTMLAnchorElement&&anchor.getAttribute('href')?.startsWith('/')&&anchor.getAttribute('href')!=='/'){
      event.preventDefault();event.stopPropagation();choose(anchor.getAttribute('href')!);
    }
  }}>
    <WelcomeTour demo stepList={securityDemoSteps} introduction={securityDemoIntroduction} homePath="/demo/security" screensReady onNavigate={choose}/>
    <header className="rw-demo-banner"><div><strong>DEMO</strong><span>Fictional data only · No real customer information</span></div><div><button type="button" onClick={()=>window.dispatchEvent(new Event('rw-replay-welcome-tour'))}>Replay security tour</button><a href="/">← Back to home</a></div></header>
    <button type="button" className="rw-demo-menu" aria-label="Toggle demo navigation" aria-expanded={menu} onClick={()=>setMenu(value=>!value)}><Menu size={20}/></button>
    <div className="rw-unified-customer-layout rw-unified-soc-layout">
      <aside data-name="Unified SOC Sidebar" className={`rw-unified-sidebar rw-soc-shared-sidebar rw-demo-sidebar ${menu?'is-open':''}`}>
        <a href="/" aria-label="Russell Wealth home"><img src="/assets/c8aca.png" alt="Russell Wealth"/></a><p>SECURITY OPERATIONS</p>
        <nav aria-label="Demo SOC navigation">{items.map(([label,Icon])=><button type="button" key={label} aria-current={section===label?'page':undefined} onClick={()=>choose(sectionLink(label))}><Icon size={19}/>{label}</button>)}</nav>
        <div className="rw-demo-identity">Morgan Chen<small>Public preview · Simulated environment</small></div>
      </aside>
      <div className="rw-unified-customer-content">{notice&&<p role="status" className="rw-demo-action-notice">{notice}</p>}<p className="border-b border-[#34483b] bg-[#131d19] px-5 py-3 text-xs text-[#b4cbbd]">Public sandbox · Example events, locations, sessions, and service checks · Preview changes reset when the page reloads</p><div className="rw-page-transition">{isDashboard(section)?<SecurityDashboard/>:<Module key={section+location.search}/>}</div></div>
    </div>
  </div></SecurityDemoContext.Provider>;
}
