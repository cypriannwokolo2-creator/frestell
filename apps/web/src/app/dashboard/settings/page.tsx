import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import Link from 'next/link';

const sections = [
  { href: '/dashboard/settings/profile', label: 'Profile', desc: 'Bio, skills, portfolio, services, social links' },
  { href: '/dashboard/settings/appearance', label: 'Appearance', desc: 'Theme preferences' },
  { href: '/dashboard/settings/security', label: 'Security', desc: 'Password, 2FA, passkeys, sessions' },
];

export default function SettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">Manage your account settings.</p>

          <div className="space-y-3">
            {sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="card-bw block p-5 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
