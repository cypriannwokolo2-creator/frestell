type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'border-[var(--border)] text-[var(--text-secondary)]',
  success: 'border-green-500/50 text-green-600 dark:text-green-400',
  warning: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
  error: 'border-red-500/50 text-red-500',
  info: 'border-blue-500/50 text-blue-600 dark:text-blue-400',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium tracking-wider uppercase border radius-brutal ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
