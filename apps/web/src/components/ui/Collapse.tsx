import { ReactNode } from 'react';

interface CollapseProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'danger';
}

export function Collapse({ title, children, defaultOpen = false, variant = 'default' }: CollapseProps) {
  const titleColor = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : 'text-[var(--text-primary)]';

  return (
    <details open={defaultOpen} className="group">
      <summary className={`flex items-center justify-between cursor-pointer list-none text-sm font-semibold uppercase tracking-wider ${titleColor} hover:opacity-80 transition-opacity`}>
        <span>{title}</span>
        <span className="text-[var(--text-muted)] text-xs transition-transform duration-200 group-open:rotate-90">
          &#9656;
        </span>
      </summary>
      <div className="mt-4">
        {children}
      </div>
    </details>
  );
}
