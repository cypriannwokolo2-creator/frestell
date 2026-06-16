'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { Spinner } from '@/components/ui/Button';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  fallback?: string;
}

export function AuthGuard({ children, requireAuth = true, fallback = '/login' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) router.push(fallback);
    if (requireAuth && user?.deletedAt) router.push('/restore-account');
    if (!requireAuth && user && !user.deletedAt) router.push('/dashboard');
  }, [user, loading, requireAuth, fallback, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (requireAuth && !user) return null;
  if (requireAuth && user?.deletedAt) return null;
  if (!requireAuth && user && !user.deletedAt) return null;

  return <>{children}</>;
}
