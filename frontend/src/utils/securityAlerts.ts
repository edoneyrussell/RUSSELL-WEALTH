export function severityLabel(severity:string) {
  const text=severity.trim().toLowerCase();
  return text?text[0].toUpperCase()+text.slice(1):'Unknown';
}
export function statusLabel(status?:string) {
  return status==='NEW'?'New':status==='UNDER_REVIEW'?'Under review':status==='RESOLVED'?'Resolved':status||'Unknown';
}
export function formatReginaAlertTime(value:string|null|undefined) {
  if(!value)return {date:'—',time:'—'};
  let normalized=value.trim();
  if(/^\d{4}-\d{2}-\d{2}[ T]/.test(normalized)) {
    normalized=normalized.replace(' ','T');
    if(!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized))normalized+='Z';
  }
  const timestamp=new Date(normalized);
  if(Number.isNaN(timestamp.getTime()))return {date:'—',time:'—'};
  return {date:new Intl.DateTimeFormat('en-US',{timeZone:'America/Regina',month:'short',day:'numeric',year:'numeric'}).format(timestamp),time:new Intl.DateTimeFormat('en-US',{timeZone:'America/Regina',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(timestamp)};
}
