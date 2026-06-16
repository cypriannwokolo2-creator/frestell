'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens } from '@/lib/api-client';
import { useAuth } from '@/context/AuthProvider';
import { Button, Spinner } from '@/components/ui/Button';

export function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const accessToken = searchParams?.get('accessToken');
    const refreshToken = searchParams?.get('refreshToken');
    const err = searchParams?.get('error');
    const newUser = searchParams?.get('newUser');
    const userEmail = searchParams?.get('email');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      if (userEmail) setEmail(userEmail);

      if (newUser === 'true') {
        const timer = setTimeout(() => refreshUser().then(() => router.push('/dashboard')), 2500);
        return () => clearTimeout(timer);
      } else {
        refreshUser().then(() => router.push('/dashboard'));
      }
    } else if (err) {
      setError(err);
    } else {
      setError('Missing authentication tokens');
    }
  }, [searchParams, router, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md space-y-4">
          <div className="border border-red-500/40 bg-red-500/5 radius-brutal px-5 py-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Unable to sign in</p>
            <p className="text-xs text-[var(--text-muted)]">{error}</p>
          </div>

          {error === 'This Google email is already linked to another account' && (
            <div className="card-bw p-4 text-sm space-y-2">
              <p>The Google account you used is already linked to a different FreStell profile.</p>
              <p className="text-xs text-[var(--text-muted)]">
                Sign out of Google and use the correct Google account, or sign in with your email and password.
              </p>
            </div>
          )}

          {error.includes('registered with a password') && (
            <div className="card-bw p-4 text-sm space-y-2">
              <p>This email already has a password set. Sign in with your email and password, then connect Google from your Security settings.</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => router.push('/login')}
              className="flex-1"
            >
              Back to sign in
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/signup')}
              className="flex-1"
            >
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="card-bw p-6 radius-brutal">
            <h1 className="text-lg font-semibold mb-2">Welcome to FreStell</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Your account was created with
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] radius-brutal">
              <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-mono">{email}</span>
            </div>
            <Spinner className="mx-auto mt-6" />
            <p className="text-xs text-[var(--text-muted)] mt-3">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
