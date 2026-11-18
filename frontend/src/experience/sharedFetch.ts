/** Concurrent API reads share network work, not a persistent response cache.
 * Each subscriber gets a separate Response. Writes prevent new reads from
 * joining pre-write work, and aborting one subscriber cannot cancel another.
 */
type Request = (input:string,init?:RequestInit)=>Promise<Response>;
type Read = {body:ArrayBuffer; status:number; statusText:string; headers:Headers; url:string; redirected:boolean};
export function createSharedFetch(base:Request):Request {
  const pending=new Map<string,Promise<Read>>();
  let generation=0;
  return async (input,init={})=>{
    const method=(init.method??'GET').toUpperCase();
    if(method!=='GET'){generation++;pending.clear();return base(input,init);}
    if(!input.startsWith('/api/') || (init.headers && Array.from(new Headers(init.headers)).length>0))return base(input,init);
    if(init.signal?.aborted)throw new DOMException('Request cancelled','AbortError');
    const key=JSON.stringify([generation,input,init.credentials??'same-origin',init.cache]);
    let work=pending.get(key);
    if(!work){
      work=(async()=>{
        const response=await base(input,{...init,signal:AbortSignal.timeout(30000)});
        return {body:await response.arrayBuffer(),status:response.status,statusText:response.statusText,headers:response.headers,url:response.url,redirected:response.redirected};
      })();
      pending.set(key,work);
      const current=work;
      void work.finally(()=>{if(pending.get(key)===current)pending.delete(key);}).catch(()=>{});
    }
    let abort:(()=>void)|undefined;
    try{
      const data=await (init.signal?Promise.race([work,new Promise<never>((_,reject)=>{
        abort=()=>reject(new DOMException('Request cancelled','AbortError'));
        init.signal!.addEventListener('abort',abort,{once:true});
      })]):work);
      const response=new Response([204,205,304].includes(data.status)?null:data.body.slice(0),{status:data.status,statusText:data.statusText,headers:data.headers});
      Object.defineProperties(response,{url:{value:data.url},redirected:{value:data.redirected}});
      return response;
    }finally{if(abort)init.signal?.removeEventListener('abort',abort);}
  };
}
export const sharedFetch=createSharedFetch((input,init)=>fetch(input,init));
