import { useEffect, useRef } from 'react';
import { t } from '../i18n/language';
export function useUnsavedChanges(dirty: boolean) {
  const current = useRef(dirty); current.current = dirty;
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {if (current.current) {event.preventDefault();event.returnValue='';}};
    const leave = (event: MouseEvent) => {
      if (!current.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.download) return;
      const next = new URL(link.href);
      if (next.pathname === location.pathname && next.search === location.search && next.hash) return;
      if (!window.confirm(t('You have unsaved changes. Leave this page?'))) {event.preventDefault();event.stopImmediatePropagation();}
      else current.current=false;
    };
    window.addEventListener('beforeunload',beforeUnload);document.addEventListener('click',leave,true);
    return()=>{window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',leave,true);};
  },[]);
}
