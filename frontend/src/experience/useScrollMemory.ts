import { useLayoutEffect } from 'react';
import { readViewState } from './ViewState';
export function useScrollMemory(route: string) {
  useLayoutEffect(()=>{
    if(document.documentElement.dataset.rwWelcomeTourActive === 'true') return;
    const key='scroll:'+route;
    const saved=readViewState(key,0);
    let restoring=saved>0;
    const stop=()=>{restoring=false;observer.disconnect();mutations.disconnect();};
    const restore=()=>{
      if(restoring && document.documentElement.scrollHeight-window.innerHeight>=saved){window.scrollTo({top:saved,behavior:'instant'});stop();}
    };
    const observer=new ResizeObserver(restore);
    const mutations=new MutationObserver(restore);
    if(restoring){observer.observe(document.documentElement);mutations.observe(document.documentElement,{childList:true,subtree:true});restore();}else window.scrollTo({top:0,behavior:'instant'});
    const timer=setTimeout(stop,10000);
    const save=()=>{
      if(document.documentElement.dataset.rwWelcomeTourActive !== 'true' && !restoring && location.pathname+location.search+location.hash===route) {
        try {sessionStorage.setItem('rw-view:'+key,JSON.stringify(window.scrollY));}catch{}
      }
    };
    window.addEventListener('scroll',save,{passive:true});window.addEventListener('beforeunload',save);
    window.addEventListener('wheel',stop,{passive:true});window.addEventListener('touchstart',stop,{passive:true});
    return()=>{clearTimeout(timer);observer.disconnect();mutations.disconnect();window.removeEventListener('scroll',save);window.removeEventListener('beforeunload',save);window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);};
  },[route]);
}
