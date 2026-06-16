'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Missing reset token'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.passwordResetConfirm, { token, password }, { skipAuth: true });
      toast('Password reset successfully. Sign in.', 'success');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-red-500">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-sm text-[var(--text-primary)] hover:underline block">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-500 border border-red-500/40 px-4 py-2">{error}</div>
      )}
      <Input
        label="New Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 8 characters"
        required
        autoComplete="new-password"
        minLength={8}
      />
      <Button type="submit" loading={loading} className="w-full">
        Reset Password
      </Button>
    </form>
  );
}
