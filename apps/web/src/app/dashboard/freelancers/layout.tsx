'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard/freelancers/find', label: 'Find Work', desc: 'Browse available jobs' },
  { href: '/dashboard/freelancers/applications', label: 'My Applications', desc: 'Track your proposals' },
];

export default function FreelancersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-1">Freelancers</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Find work and manage your applications.
          </p>

          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 text-sm border radius-brutal transition-all duration-200 ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {children}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
