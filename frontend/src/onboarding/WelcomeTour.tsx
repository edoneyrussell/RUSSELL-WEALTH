import { sharedFetch } from '../experience/sharedFetch';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/language';
import { isTourProgress, welcomeSteps, type TourProgress } from './steps';
import { prepareWelcomeScreens } from './preload';
import './welcome-tour.css';

const endpoint='/api/customer/welcome-tour';
const subscribeToLocationPrompt=(changed:()=>void)=>{
  window.addEventListener('rw-location-prompt',changed);
  return()=>window.removeEventListener('rw-location-prompt',changed);
};
const locationPromptClosed=()=>document.documentElement.dataset.rwLocationPrompt==='closed';
function navigate(path:string){
  if(location.pathname+location.search===path && !location.hash)return;
  history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));
}
type Highlight={top:number;left:number;width:number;height:number;target:string};
export default function WelcomeTour(){
  const [progress,setProgress]=useState<TourProgress|null>(null);
  const [prepared,setPrepared]=useState(false);
  const [error,setError]=useState('');
  const [rect,setRect]=useState<Highlight|null>(null);
  const [readyTarget,setReadyTarget]=useState('');
  const locationReady=useSyncExternalStore(subscribeToLocationPrompt,locationPromptClosed);
  const dialog=useRef<HTMLDialogElement>(null);
  const panel=useRef<HTMLElement>(null);
  const action=useRef<HTMLButtonElement>(null);
  const alive=useRef(false);
  const writes=useRef<Promise<void>>(Promise.resolve());
  const showing=progress?.status==='pending'||progress?.status==='active';
  const active=progress?.status==='active';
  const step=welcomeSteps[progress?.step??0];

  useEffect(()=>{
    alive.current=true;
    const controller=new AbortController();
    sharedFetch(endpoint,{credentials:'same-origin',signal:controller.signal})
      .then(async response=>response.ok?response.json():null)
      .then(value=>{if(alive.current && isTourProgress(value))setProgress(value);}).catch(()=>{});
    const replay=()=>{setError('');setProgress({status:'pending',step:0});};
    window.addEventListener('rw-replay-welcome-tour',replay);
    return()=>{alive.current=false;controller.abort();window.removeEventListener('rw-replay-welcome-tour',replay);};
  },[]);

  useEffect(()=>{
    if(!showing || !locationReady || prepared)return;
    let cancelled=false;
    void prepareWelcomeScreens().then(results=>{
      if(cancelled)return;
      if(results.every(result=>result.status==='fulfilled'))setPrepared(true);
      else setError('Some tour screens could not load. Please reload and replay the tour from Settings.');
    });
    return()=>{cancelled=true;};
  },[showing,locationReady,prepared]);

  useLayoutEffect(()=>{
    const element=dialog.current;
    if(showing && locationReady){
      if(element && !element.open)element.showModal();
      action.current?.focus({preventScroll:true});
      document.documentElement.dataset.rwWelcomeTourActive='true';
    }else{element?.close();delete document.documentElement.dataset.rwWelcomeTourActive;}
    return()=>{delete document.documentElement.dataset.rwWelcomeTourActive;};
  },[showing,locationReady]);

  useEffect(()=>{
    if(!showing || !locationReady)return;
    const prevent=(event:Event)=>event.preventDefault();
    const keys=(event:KeyboardEvent)=>{
      if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key) &&
        !(event.key===' ' && (event.target as HTMLElement)?.tagName==='BUTTON'))event.preventDefault();
    };
    document.addEventListener('wheel',prevent,{passive:false,capture:true});
    document.addEventListener('touchmove',prevent,{passive:false,capture:true});
    document.addEventListener('keydown',keys,true);
    return()=>{document.removeEventListener('wheel',prevent,true);document.removeEventListener('touchmove',prevent,true);document.removeEventListener('keydown',keys,true);};
  },[showing,locationReady]);

  useLayoutEffect(()=>{
    if(!active || !locationReady || !prepared)return;
    navigate(step.path);setRect(null);setReadyTarget('');
    let target:HTMLElement|null=null;
    let stopped=false;
    let attempts=0;
    let retry:ReturnType<typeof setTimeout>|undefined;
    let scheduled:ReturnType<typeof setTimeout>|undefined;
    let previous='';
    const measure=()=>{
      scheduled=undefined;
      if(stopped || !target)return;
      const viewport=window.visualViewport;
      const screenHeight=viewport?.height??innerHeight;
      const screenWidth=viewport?.width??innerWidth;
      const ceiling=panel.current?.getBoundingClientRect().top??screenHeight-360;
      const start=Math.max(12,Math.min(88,ceiling/4));
      const bounds=target.getBoundingClientRect();
      // One deliberate positioning operation, only when layout actually moves.
      if(Math.abs(bounds.top-start)>2){window.scrollBy({top:bounds.top-start,behavior:'instant'});}
      const box=target.getBoundingClientRect();
      const top=Math.max(8,box.top-5),left=Math.max(8,box.left-5);
      const next={top,left,width:Math.max(0,Math.min(screenWidth-8,box.right+5)-left),
        height:Math.max(0,Math.min(ceiling-12,box.bottom+5)-top),target:step.target};
      const key=JSON.stringify(next);
      if(previous!==key){previous=key;setRect(next.width&&next.height?next:null);}
      setReadyTarget(step.target);
    };
    const schedule=()=>{if(scheduled===undefined)scheduled=setTimeout(measure,16);};
    const resize=new ResizeObserver(schedule);
    const find=()=>{
      if(stopped)return;
      target=document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if(target?.getClientRects().length){
        resize.observe(target);
        if(panel.current)resize.observe(panel.current);
        const content=document.querySelector('.rw-unified-customer-content')??document.querySelector('.screen-shell');
        if(content)resize.observe(content);
        measure();action.current?.focus({preventScroll:true});
      }else if(attempts++<100)retry=setTimeout(find,100);
      else setError('This section is taking longer to load. You can continue or exit the tour.');
    };
    find();
    window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
    return()=>{stopped=true;clearTimeout(retry);clearTimeout(scheduled);resize.disconnect();window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);};
  },[active,progress?.step,locationReady,prepared,step]);

  function move(next:TourProgress){
    const previous=progress;
    setError('');setProgress(next);
    if(next.status==='completed'){navigate('/dashboard');setTimeout(()=>window.scrollTo({top:0,behavior:'instant'}),0);}
    // Steps are local and instant. Only start/exit/finish need a durable write;
    // later logins never resume an old tour automatically.
    if(next.status==='active' && previous?.status==='active')return;
    writes.current=writes.current.catch(()=>{}).then(async()=>{
      try{
        const response=await fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify(next)});
        if(!response.ok)throw new Error();
      }catch{
        if(alive.current)window.dispatchEvent(new CustomEvent('rw-toast',{detail:{type:'warning',message:t('Your tour preference could not be saved. You can replay the tour from Settings.')}}));
      }
    });
  }
  return createPortal(<dialog ref={dialog} className="rw-tour" aria-labelledby="rw-tour-title" aria-describedby="rw-tour-description" onCancel={event=>{event.preventDefault();if(progress)move({status:'skipped',step:progress.step});}}>
    {rect && rect.target===step.target && active && <div aria-hidden="true" className="rw-tour-highlight" data-tour-target={rect.target} style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}}/>}
    <section ref={panel} className="rw-tour-panel">
      <div className="rw-tour-eyebrow">{active?t('Welcome tour · {0} of {1}').replace('{0}',String((progress?.step??0)+1)).replace('{1}',String(welcomeSteps.length)):t('WELCOME TO RUSSELL WEALTH')}</div>
      <h2 id="rw-tour-title">{t(active?step.title:'Let’s show you around')}</h2>
      <p id="rw-tour-description">{t(active?step.body:'Take a guided walkthrough of accounts, investing, markets, watchlists, transfers, and settings. Read each step and choose Next. You can skip now and replay the tour from Settings anytime.')}</p>
      {!prepared && showing && <p className="rw-tour-hint" role="status">{t('Preparing your walkthrough…')}</p>}
      {error && <p className="rw-tour-error" role="alert">{t(error)}</p>}
      {active && <progress aria-label={t('Welcome tour progress')} value={(progress?.step??0)+1} max={welcomeSteps.length}/>}
      <footer>
        <button type="button" onClick={()=>move({status:'skipped',step:progress?.step??0})}>{t(active?'Exit tour':'Skip for now')}</button>
        {active && (progress?.step??0)>0 && <button type="button" onClick={()=>move({status:'active',step:(progress?.step??1)-1})}>{t('Back')}</button>}
        <button ref={action} type="button" className="rw-tour-next" disabled={!prepared || (active && readyTarget!==step.target && !error)} onClick={()=>move(!active?{status:'active',step:0}:(progress?.step??0)===welcomeSteps.length-1?{status:'completed',step:welcomeSteps.length-1}:{status:'active',step:(progress?.step??0)+1})}>{t(!active?'Show me around':(progress?.step??0)===welcomeSteps.length-1?'Finish tour':'Next')}</button>
      </footer>
    </section>
  </dialog>,document.body);
}
