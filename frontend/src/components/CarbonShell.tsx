import type { ReactNode } from 'react';
import { LayoutDashboard, ChartPie, ArrowLeftRight, ReceiptText, TrendingUp, Settings, Shield, AlertTriangle, ScrollText, LogOut, Search, ArrowUpRight } from 'lucide-react';
import { logout } from '../auth';

type Workspace = 'wealth' | 'security';
export default function CarbonShell({ workspace, active, title, subtitle, actions, children }: {workspace: Workspace; active: string; title: string; subtitle: string; actions?: ReactNode; children: ReactNode}) {
 const wealth = workspace === 'wealth';
 const links = wealth ? [
  {name:'Overview',href:'/dashboard',icon:LayoutDashboard},{name:'Portfolio',href:'/portfolio',icon:ChartPie},{name:'Markets',href:'/markets',icon:TrendingUp},{name:'Transactions',href:'/transactions',icon:ReceiptText},{name:'Trade',href:'/dashboard#trade',icon:ArrowLeftRight},
 ] : [{name:'Security overview',href:'/security',icon:Shield},{name:'Incident review',href:'/security/incidents/INC-2026-0142',icon:AlertTriangle},{name:'Admin settings',href:'/admin/settings',icon:Settings}];
 return <div className="carbon-app">
  <aside className="carbon-sidebar">
   <a className="carbon-brand" href={wealth ? '/dashboard' : '/security'}><span className="carbon-brand-mark">R</span><span><strong>RUSSELL</strong><small>WEALTH <em>/ {wealth ? 'PRIVATE CLIENT' : 'SECURITY'}</em></small></span></a>
   <div className="carbon-workspace"><span className="carbon-workspace-dot"/> {wealth ? 'WEALTH MANAGEMENT' : 'SECURITY OPERATIONS'}</div>
   <div className="carbon-nav-caption">WORKSPACE</div>
   <nav className="carbon-nav" aria-label="Workspace navigation">{links.map(({name,href,icon:Icon})=><a key={href} href={href} className={'carbon-nav-item '+(active===href?'is-active':'')}><Icon size={17} strokeWidth={1.7}/><span>{name}</span>{active===href && <span className="carbon-nav-active"/>}</a>)}</nav>
   <div className="carbon-sidebar-spacer"/>
   <div className="carbon-nav-caption">ACCOUNT</div>
   <a className="carbon-nav-item" href={wealth?'/customer/settings':'/admin/settings'}><Settings size={17}/> Settings</a>
   <button className="carbon-nav-item carbon-signout" onClick={logout}><LogOut size={17}/> Sign out</button>
   <div className="carbon-sidebar-footer"><span className="carbon-avatar">RW</span><span><strong>Russell Wealth</strong><small>Simulation environment</small></span><ArrowUpRight size={14}/></div>
  </aside>
  <main className="carbon-main">
   <div className="carbon-topbar"><div className="carbon-breadcrumb">RUSSELL WEALTH <span>/</span> {wealth?'CLIENT PORTAL':'SOC CONSOLE'}</div><div className="carbon-topbar-right"><span className="carbon-demo"><span/> DEMO ENVIRONMENT</span><button className="carbon-search" onClick={()=>window.dispatchEvent(new Event('russellwealth:open-market-search'))} aria-label="Open market search"><Search size={16}/></button></div></div>
   <div className="carbon-page-head"><div><div className="carbon-eyebrow">{wealth?'YOUR FINANCIAL WORKSPACE':'SECURITY INTELLIGENCE'}</div><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="carbon-head-actions">{actions}</div>}</div>
   <div className="carbon-content">{children}</div>
   <footer className="carbon-footer">RUSSELL WEALTH <span>•</span> FICTIONAL FINTECH & CYBERSECURITY PROJECT <span>•</span> NO REAL INVESTMENTS OR TRANSACTIONS</footer>
  </main>
 </div>;
}
