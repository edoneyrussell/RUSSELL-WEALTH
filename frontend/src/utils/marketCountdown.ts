export function marketCountdown(target: string | null | undefined, now: number) {
  const time = target ? Date.parse(target) : NaN;
  if (!Number.isFinite(time)) return null;
  const seconds = Math.max(0, Math.ceil((time - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remaining = seconds % 60;
  return {seconds, text:`${days ? `${days}d ` : ''}${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(remaining).padStart(2,'0')}s`};
}
