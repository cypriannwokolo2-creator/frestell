'use client';

import { useAuth } from '@/context/AuthProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast('Signed out', 'info');
    router.push('/login');
  };

  return (
    <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--bg-primary)]">
      <div className="text-xs text-[var(--text-muted)] tracking-wide">
        {user?.displayName || user?.email || 'Dashboard'}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
