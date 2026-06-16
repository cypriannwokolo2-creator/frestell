'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { RecoveryEmailModal } from '@/components/auth/RecoveryEmailModal';
import { useAuth } from '@/context/AuthProvider';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [views, setViews] = useState<any>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('recovery_email_dismissed');
    if (user?.email?.includes('@passkey.frestell.com') && !dismissed) {
      setShowRecoveryPrompt(true);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'freelancer') {
      apiClient.get(ENDPOINTS.profileViews).then(setViews).catch(() => {});
    }
  }, [user]);

  const handleClose = () => {
    setShowRecoveryPrompt(false);
    sessionStorage.setItem('recovery_email_dismissed', 'true');
  };

  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Welcome to your Frestell dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-bw p-5">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</div>
              <div className="text-lg font-semibold">Active</div>
            </div>
            <div className="card-bw p-5">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Role</div>
              <div className="text-lg font-semibold capitalize">{user?.role || '—'}</div>
            </div>
            <div className="card-bw p-5">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Tier</div>
              <div className="text-lg font-semibold capitalize">{user?.tier?.replace('_', ' ') || '—'}</div>
            </div>
          </div>

          {/* ─── Profile Analytics (Freelancer) ──────────── */}
          {user?.role === 'freelancer' && views && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="card-bw p-4 text-center">
                <div className="text-xl font-bold">{views.total}</div>
                <div className="text-xs text-[var(--text-muted)]">Profile Views</div>
              </div>
              <div className="card-bw p-4 text-center">
                <div className="text-xl font-bold">{views.uniqueViewers}</div>
                <div className="text-xs text-[var(--text-muted)]">Unique Viewers</div>
              </div>
              <div className="card-bw p-4 text-center">
                <div className="text-xl font-bold">{views.last30Days}</div>
                <div className="text-xs text-[var(--text-muted)]">Last 30 Days</div>
              </div>
            </div>
          )}

          {user?.email?.includes('@passkey.frestell.com') && (
            <div className="card-bw p-5 mb-8 border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3 mb-2">
                <svg className="icon w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h2 className="text-sm font-semibold">Passkey Account</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                You&apos;re using a passkey for authentication. Add a recovery email to ensure you don&apos;t lose access to your account.
              </p>
              <button
                onClick={() => setShowRecoveryPrompt(true)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                Add recovery email &rarr;
              </button>
            </div>
          )}

          {user?.googleId && !user?.hasPassword && !user?.email?.includes('@passkey.frestell.com') && (
            <div className="card-bw p-5 mb-8 border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-3 mb-2">
                <svg className="icon w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <h2 className="text-sm font-semibold">Google Account</h2>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                You&apos;re signed in with Google. Set a password in your Security settings to also sign in with email.
              </p>
            </div>
          )}
        </div>
      </DashboardShell>

      <RecoveryEmailModal open={showRecoveryPrompt} onClose={handleClose} />
    </AuthGuard>
  );
}
