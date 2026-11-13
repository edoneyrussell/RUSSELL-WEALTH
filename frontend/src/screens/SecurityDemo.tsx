import { useEffect, useState } from 'react';
import { LayoutDashboard, TriangleAlert, ClipboardList, List, Network, UsersRound, Settings, Menu } from 'lucide-react';
import SecurityDashboard from './SecurityDashboard';
import { SecurityDemoContext } from '../demo/securityDemo';

const items = [
  ['SOC Dashboard', LayoutDashboard], ['Alerts', TriangleAlert], ['Incidents', ClipboardList],
  ['Logs', List], ['Network', Network], ['Access', UsersRound], ['Admin Settings', Settings],
] as const;

export default function SecurityDemo() {
  const [section, setSection] = useState('SOC Dashboard');
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const update = (event: Event) => {
      const panel = (event as CustomEvent<{panel: string | null}>).detail?.panel;
      setSection(previous => ['SOC Dashboard', 'Alerts', 'Logs'].includes(previous) ? panel || 'SOC Dashboard' : previous);
    };
    window.addEventListener('rw-soc-active-panel', update);
    return () => window.removeEventListener('rw-soc-active-panel', update);
  }, []);
  const dashboard = ['SOC Dashboard', 'Alerts', 'Logs'].includes(section);
  const choose = (label: string) => {
    setMenu(false);
    setSection(label);
    // After mounting the dashboard, open the same panels used by the private SOC.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.dispatchEvent(new Event(label === 'Alerts' ? 'rw-open-security-alerts' : label === 'Logs' ? 'rw-open-security-logs' : 'rw-close-security-panels'));
      setSection(label);
      window.scrollTo({top:0, behavior:'instant'});
    }));
  };
  return <SecurityDemoContext.Provider value={true}>
    <div className="rw-security-demo" onClick={event => event.stopPropagation()}>
      <header className="rw-demo-banner"><div><strong>DEMO</strong><span>Fictional data only · No real customer information</span></div><a href="/">← Back to home</a></header>
      <button type="button" className="rw-demo-menu" aria-label="Toggle demo navigation" aria-expanded={menu} onClick={() => setMenu(value => !value)}><Menu size={20}/></button>
      <div className="rw-unified-customer-layout rw-unified-soc-layout">
        <aside data-name="Unified SOC Sidebar" className={`rw-unified-sidebar rw-soc-shared-sidebar rw-demo-sidebar ${menu ? 'is-open' : ''}`}>
          <a href="/" aria-label="Russell Wealth home"><img src="/assets/c8aca.png" alt="Russell Wealth" /></a>
          <p>SECURITY OPERATIONS</p>
          <nav aria-label="Demo SOC navigation">{items.map(([label, Icon]) => <button type="button" key={label} aria-current={section === label ? 'page' : undefined} onClick={() => choose(label)}><Icon size={19}/>{label}</button>)}</nav>
          <div className="rw-demo-identity">Demo Analyst<small>Public preview · Simulated environment</small></div>
        </aside>
        <div className="rw-unified-customer-content"><div className="rw-page-transition">
          {dashboard ? <SecurityDashboard /> : <DemoModule section={section}/>}
        </div></div>
      </div>
    </div>
  </SecurityDemoContext.Provider>;
}

function DemoModule({section}: {section: string}) {
  const samples = section === 'Access' ? [
    ['Alex Morgan', 'alex@example.com · Customer · Active'], ['Jordan Lee', 'jordan@example.com · Customer + SOC Admin · Active'], ['Taylor Quinn', 'taylor@example.com · Customer · Suspended'],
  ] : section === 'Network' ? [
    ['Demo application gateway', '192.0.2.10 · Healthy'], ['Demo API service', '198.51.100.24 · Healthy'], ['Demo database', '203.0.113.8 · Monitoring enabled'],
  ] : section === 'Incidents' ? [
    ['DEMO-001 · Repeated sign-in failures', 'Critical · Investigating · alex@example.com'], ['DEMO-002 · Unusual source address', 'Warning · Contained · jordan@example.com'], ['DEMO-003 · Access review', 'Info · Resolved · taylor@example.com'],
  ] : [['Demo Analyst', 'SOC administrator · Preview access only'], ['Monitoring', 'Fictional events · No live integrations'], ['Account controls', 'Read-only preview · Real accounts cannot be changed']];
  return <main className="rw-demo-module"><p>RUSSELL WEALTH / DEMO OPERATIONS</p><h1>{section === 'Access' ? 'Access Management' : section}</h1><p>This preview contains fictional examples. No real accounts or infrastructure are connected.</p><div>{samples.map(([title,detail])=><article key={title}><h2>{title}</h2><p>{detail}</p></article>)}</div></main>;
}
