import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { securityTourSteps } from './security-tour-steps';
import './security-tour.css';

type Highlight={top:number;left:number;width:number;height:number;target:string};
export default function SecurityTour({onNavigate}:{onNavigate:(section:string)=>void}){
  const [status,setStatus]=useState<'pending'|'active'|'closed'>('pending');
  const [stepIndex,setStepIndex]=useState(0);
  const [rect,setRect]=useState<Highlight|null>(null);
  const [readyTarget,setReadyTarget]=useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  const panel=useRef<HTMLElement>(null);
  const action=useRef<HTMLButtonElement>(null);
  const navigateRef=useRef(onNavigate);
  navigateRef.current=onNavigate;
  const active=status==='active';
  const step=securityTourSteps[stepIndex];

  useEffect(()=>{
    const replay=()=>{setStepIndex(0);setStatus('pending');};
    window.addEventListener('rw-replay-security-tour',replay);
    return()=>window.removeEventListener('rw-replay-security-tour',replay);
  },[]);

  useLayoutEffect(()=>{
    const element=dialog.current;
    if(status!=='closed'){
      if(element&&!element.open)element.showModal();
      action.current?.focus({preventScroll:true});
      document.documentElement.dataset.rwSecurityTourActive='true';
    }else{element?.close();delete document.documentElement.dataset.rwSecurityTourActive;}
    return()=>{delete document.documentElement.dataset.rwSecurityTourActive};
  },[status]);

  useEffect(()=>{
    if(status==='closed')return;
    const prevent=(event:Event)=>event.preventDefault();
    const keys=(event:KeyboardEvent)=>{
      if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)&&(event.target as HTMLElement)?.tagName!== 'BUTTON')event.preventDefault();
    };
    document.addEventListener('wheel',prevent,{passive:false,capture:true});
    document.addEventListener('touchmove',prevent,{passive:false,capture:true});
    document.addEventListener('keydown',keys,true);
    return()=>{document.removeEventListener('wheel',prevent,true);document.removeEventListener('touchmove',prevent,true);document.removeEventListener('keydown',keys,true)};
  },[status]);

  useLayoutEffect(()=>{
    if(!active)return;
    navigateRef.current(step.section);
    setRect(null);setReadyTarget('');
    let target:HTMLElement|null=null;
    let stopped=false;
    let attempts=0;
    let retry:ReturnType<typeof setTimeout>|undefined;
    let scheduled:ReturnType<typeof setTimeout>|undefined;
    const measure=()=>{
      scheduled=undefined;
      if(stopped||!target||!panel.current)return;
      const ceiling=panel.current.getBoundingClientRect().top;
      const bounds=target.getBoundingClientRect();
      const top=Math.max(8,bounds.top-5),left=Math.max(8,bounds.left-5);
      const right=Math.min(window.innerWidth-8,bounds.right+5);
      const bottom=Math.min(ceiling-12,bounds.bottom+5);
      setRect(right>left&&bottom>top?{top,left,width:right-left,height:bottom-top,target:step.target}:null);
      setReadyTarget(step.target);
    };
    const schedule=()=>{if(scheduled===undefined)scheduled=setTimeout(measure,16)};
    const resize=new ResizeObserver(schedule);
    const find=()=>{
      if(stopped)return;
      target=document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if(target?.getClientRects().length){
        resize.observe(target);
        resize.observe(panel.current!);
        measure();
        action.current?.focus({preventScroll:true});
      }else if(attempts++<100)retry=setTimeout(find,100);
    };
    find();
    window.addEventListener('resize',schedule);
    return()=>{stopped=true;clearTimeout(retry);clearTimeout(scheduled);resize.disconnect();window.removeEventListener('resize',schedule)};
  },[active,stepIndex,step]);

  function finish(next:'closed'|'active'|'pending',index:number){
    setStatus(next);setStepIndex(index);
  }
  return createPortal(
    <dialog ref={dialog} className="rw-security-tour" aria-labelledby="rw-security-tour-title" aria-describedby="rw-security-tour-description" onCancel={event=>{event.preventDefault();finish('closed',stepIndex)}}>
      {rect&&rect.target===step?.target&&active&&<div aria-hidden="true" className="rw-security-tour-highlight" style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}}/>}
      <section ref={panel} className="rw-security-tour-panel">
        <div className="rw-security-tour-eyebrow">{active?`SECURITY TOUR · ${stepIndex+1} OF ${securityTourSteps.length}`:'RUSSELL WEALTH SECURITY'}</div>
        <h2 id="rw-security-tour-title">{active?step.title:'Explore the security environment'}</h2>
        <p id="rw-security-tour-description" className="rw-security-tour-description">{active?step.body:'Take a guided walkthrough of monitoring, alerts, incidents, logs, network activity, access controls, and administration. Each step highlights one part of the fictional security environment.'}</p>
        {active&&<progress aria-label="Security tour progress" value={stepIndex+1} max={securityTourSteps.length}/>}
        <footer>
          <button type="button" onClick={()=>finish('closed',stepIndex)}>{active?'Exit tour':'Skip for now'}</button>
          {active&&stepIndex>0&&<button type="button" onClick={()=>finish('active',stepIndex-1)}>Back</button>}
          <button ref={action} type="button" className="rw-security-tour-next" disabled={active&&!readyTarget} onClick={()=>active?(stepIndex===securityTourSteps.length-1?finish('closed',stepIndex):finish('active',stepIndex+1)):finish('active',0)}>{active?(stepIndex===securityTourSteps.length-1?'Finish tour':'Next'):'Start tour'}</button>
        </footer>
      </section>
    </dialog>,document.body
  );
}
