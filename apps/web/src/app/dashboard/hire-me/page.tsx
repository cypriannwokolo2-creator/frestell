'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthProvider';

export default function HireMePage() {
  const { user } = useAuth();
  const profileUrl = user?.slug ? `/freelancer/${user.slug}` : null;

  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Hire Me</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Share your profile with potential clients.
            </p>
          </div>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Your Profile Link</h2>
            {profileUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Share this link with clients to showcase your profile, skills, and portfolio.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--border)] radius-brutal font-mono">
                    {profileUrl}
                  </code>
                </div>
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text-primary)] hover:underline"
                >
                  View your public profile &rarr;
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--text-muted)]">
                  Set a username in your profile settings to get a shareable link.
                </p>
              </div>
            )}
          </Card>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
