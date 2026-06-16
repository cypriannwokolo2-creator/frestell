import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
  showTagline?: boolean;
}

export function Logo({ href = '/', className = '', showTagline = false }: LogoProps) {
  const mark = (
    <span className="inline-flex items-center gap-2">
      <svg className="icon" width="28" height="28" viewBox="0 0 32 32">
        <rect x="2" y="2" width="28" height="28" rx="0" ry="0"
          strokeWidth="2" fill="none"
          className="stroke-[var(--text-primary)]"
          style={{ borderRadius: '8px 0 8px 0' }}
        />
        <line x1="10" y1="16" x2="22" y2="16" strokeWidth="2"
          className="stroke-[var(--text-primary)]" />
        <line x1="16" y1="10" x2="16" y2="22" strokeWidth="2"
          className="stroke-[var(--text-primary)]" />
        <circle cx="16" cy="16" r="3" strokeWidth="1.5"
          className="fill-[var(--text-primary)] stroke-none" />
      </svg>
      <span className="text-sm font-bold tracking-[0.15em] uppercase text-[var(--text-primary)]">
        Frestell
      </span>
    </span>
  );

  const tagline = showTagline ? (
    <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] block mt-0.5">
      Trustless Freelance
    </span>
  ) : null;

  if (href) {
    return (
      <Link href={href} className={`inline-flex flex-col ${className}`}>
        {mark}
        {tagline}
      </Link>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      {mark}
      {tagline}
    </div>
  );
}
