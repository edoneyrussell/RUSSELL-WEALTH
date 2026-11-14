export function getGreeting(now = new Date()) {
  const hour=now.getHours();
  if(hour<5 || hour>20 || (hour===20&&now.getMinutes()>=30))return 'Good Night';
  if(hour<12)return 'Good Morning';
  if(hour<17)return 'Good Afternoon';
  return 'Good Evening';
}
