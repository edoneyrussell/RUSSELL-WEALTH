import { useState } from 'react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function ExpandablePanel({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rw-expandable-panel">
      <button
        type="button"
        className="rw-expandable-trigger"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
      >
        <span className="flex flex-col items-start gap-1">
          <span className="text-[#f5f5f5] font-semibold text-sm">
            {title}
          </span>

          {subtitle && (
            <span className="text-[#8c929c] text-xs">
              {subtitle}
            </span>
          )}
        </span>

        <span
          className={`rw-expandable-chevron ${open ? 'is-open' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="rw-expandable-content">
          {children}
        </div>
      )}
    </section>
  );
}
