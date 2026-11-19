export const emptyActionClass = 'rounded-lg border border-[#35463E] px-4 py-2 text-sm text-[#C5DDCF] hover:bg-[#23352C] focus-visible:outline-2 focus-visible:outline-[#9CC7AF]';
import type { ReactNode } from 'react';

/** Present a confirmed empty result with a useful next step. */
export default function EmptyState({ title, description, children }: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <div className="w-full min-w-0 px-4 py-8 text-center sm:px-6">
    <h3 className="text-base font-semibold text-[#E2EAE5]">{title}</h3>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#9CAEA3]">{description}</p>
    {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>}
  </div>;
}
