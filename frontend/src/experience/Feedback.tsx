import { Component, useEffect, useState, type ReactNode } from 'react';
import { getLocale } from '../i18n/language';

export function Skeleton({rows = 3}: {rows?: number}) {
  return <div role="status" aria-label="Loading content" className="rw-skeleton-card"><span className="sr-only">Loading content</span><div aria-hidden="true" className="rw-skeleton-title"/>{Array.from({length:rows},(_,index)=><div aria-hidden="true" key={index} className="rw-skeleton-row"/>)}</div>;
}
export function PageSkeleton() {
  return <div className="rw-page-skeleton"><div className="rw-load-track" role="progressbar" aria-label="Loading page"><div className="rw-load-wait"/></div><Skeleton rows={1}/><div className="grid gap-5 sm:grid-cols-2"><Skeleton/><Skeleton/></div><Skeleton rows={4}/></div>;
}
export function DataStatus({error,updatedAt,onRetry}: {error?: string | null;updatedAt?: Date | null;onRetry:()=>void}) {
  return <div className="rw-data-status" role={error ? 'status' : undefined}>
    {error && <><span>{error} {updatedAt ? 'Showing the last available data.' : ''}</span><button type="button" onClick={onRetry}>Retry</button></>}
    {updatedAt && <span>Updated {updatedAt.toLocaleTimeString(getLocale())}</span>}
  </div>;
}
export function ConnectionNotice() {
  const [offline,setOffline] = useState(!navigator.onLine);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
  return offline ? <div role="status" className="rw-offline-notice">You’re offline. Displayed data may be out of date. Updates resume when connected.<button type="button" onClick={()=>window.dispatchEvent(new Event('rw-retry-data'))}>Retry</button></div> : null;
}
export class PageBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed ? <div role="alert" className="rw-page-skeleton"><h1>This page could not load.</h1><p>Check your connection and try again.</p><button className="rw-retry-button" onClick={()=>window.location.reload()}>Reload page</button></div> : this.props.children;}
}
