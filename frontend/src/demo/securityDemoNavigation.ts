export const demoSections=['SOC Dashboard','Alerts','Incidents','Logs','Network','Access','Active Sessions','Admin Settings'] as const;
export type DemoSection=typeof demoSections[number];
const routes:Record<string,DemoSection>={'/security':'SOC Dashboard','/security/incidents':'Incidents','/security/network':'Network','/security/access':'Access','/security/sessions':'Active Sessions','/admin/settings':'Admin Settings'};
export function demoSection(search:string):DemoSection{
  const params=new URLSearchParams(search),section=params.get('section');
  if(demoSections.includes(section as DemoSection))return section as DemoSection;
  return params.get('panel')==='logs'?'Logs':params.get('panel')==='alerts'?'Alerts':'SOC Dashboard';
}
export function demoSecurityLink(path:string):string|null{
  const url=new URL(path,'https://preview.invalid');
  if(url.origin!=='https://preview.invalid')return null;
  if(url.pathname==='/demo/security')return url.pathname+url.search;
  const section=routes[url.pathname]??(url.pathname.startsWith('/security/incidents/')?'Incidents':null);
  if(!section)return null;
  if(section!=='SOC Dashboard')url.searchParams.set('section',section);
  return '/demo/security'+(url.searchParams.size?'?'+url.searchParams:'');
}
