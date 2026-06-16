'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/ui/Logo';

export function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const titles: Record<string, string> = {
    '/login': 'Sign In',
    '/signup': 'Create Account',
    '/forgot-password': 'Reset Password',
    '/reset-password': 'Set New Password',
    '/verify-email': 'Verify Email',
    '/restore-account': 'Restore Account',
  };
  const title = titles[pathname] ?? '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--bg-primary)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="glass w-full max-w-md p-8 mb-4">
        <div className="flex justify-center mb-6">
          <Logo showTagline />
        </div>
        {title && <h1 className="text-xl font-bold tracking-tight mb-6 text-center">{title}</h1>}
        {children}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-4">
        &copy; {new Date().getFullYear()} Frestell. All rights reserved.
      </p>
    </div>
  );
}
