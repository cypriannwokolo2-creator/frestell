'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Card } from '@/components/ui/Card';

export default function AppearanceSettings() {
  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Appearance</h1>
            <p className="text-sm text-[var(--text-secondary)]">Customize your interface theme.</p>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Toggle between light and dark mode. Follows your system preference by default.
                </div>
              </div>
              <ThemeToggle />
            </div>
          </Card>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
