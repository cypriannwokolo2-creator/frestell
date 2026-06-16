'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { apiClient, ENDPOINTS, setTokens } from '@/lib/api-client';
import { useOtpResend } from '@/hooks/useOtpResend';

export default function RestoreAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { cooldown, loading, setLoading, startCooldown } = useOtpResend();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);

  const handleSendOtp = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.sendRestoreOtp, { email }, { skipAuth: true });
      setOtpSent(true);
      startCooldown();
      toast('Restore code sent to your email', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (otp.length !== 6) return;
    setConfirmLoading(true); setError('');
    try {
      const data = await apiClient.post<{ user: any; tokens: { accessToken: string; refreshToken: string } }>(
        ENDPOINTS.confirmRestoreOtp,
        { email, otp },
        { skipAuth: true },
      );
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setRestored(true);
      toast('Account restored successfully', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiClient.post(ENDPOINTS.sendRestoreOtp, { email }, { skipAuth: true });
      startCooldown();
      toast('Code resent', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (restored) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className="border border-green-500/40 bg-green-500/5 radius-brutal px-5 py-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Your account has been restored!</p>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Redirecting you to the dashboard...</p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">Go to Dashboard</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="border border-red-500/40 bg-red-500/5 radius-brutal px-5 py-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Your account is scheduled for deletion</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Enter the email on your account to receive a restore code. You have until the restore window expires.
          </p>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {!otpSent ? (
          <>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button onClick={handleSendOtp} loading={loading} className="w-full">
              Send Restore Code
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)] text-center">
              Enter the 6-digit code sent to <span className="font-medium">{email}</span>
            </p>
            <Input
              label="Restore Code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
            />
            <Button onClick={handleConfirm} loading={confirmLoading} className="w-full" disabled={otp.length !== 6}>
              Restore Account
            </Button>
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
              <br />
              <Link href="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}