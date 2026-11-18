import { useSyncExternalStore } from 'react';
import { requestProgress } from '../loading/requestProgress';

export default function LoadingProgress({ inline = false }: { inline?: boolean }) {
  const progress = useSyncExternalStore(requestProgress.subscribe, requestProgress.snapshot);
  const done = progress.total > 0 && progress.completed === progress.total;
  if (!inline && !progress.visible) return null;
  return <div className={inline ? 'rw-load-progress rw-load-progress-inline' : 'rw-load-progress rw-load-progress-global'} data-complete={done}>
    <div role="progressbar" aria-label="Loading screen" aria-valuemin={0} aria-valuemax={progress.total || 1}
      aria-valuenow={progress.total ? progress.completed : undefined}
      aria-valuetext={done ? 'Loading complete' : 'Loading in progress'}
      className="rw-load-track">
      <div className="rw-load-fill" style={{width: `${progress.total ? progress.completed / progress.total * 100 : 0}%`}} />
      {!done && <div className="rw-load-wait" />}
    </div>
  </div>;
}
