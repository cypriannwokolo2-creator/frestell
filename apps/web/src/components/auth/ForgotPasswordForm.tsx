'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api-client';
import { useOtpResend } from '@/hooks/useOtpResend';

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const { cooldown, loading, setLoading, startCooldown } = useOtpResend();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await apiClient.post('/auth/password-reset/request', { email }, { skipAuth: true });
      setStep('reset');
      startCooldown();
      toast('A 6-digit OTP has been sent to your email', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setSubmitLoading(true); setError('');
    try {
      await apiClient.post('/auth/password-reset/confirm', { token: otp, password }, { skipAuth: true });
      setStep('done');
      toast('Password reset successfully!', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/password-reset/request', { email }, { skipAuth: true });
      startCooldown();
      toast('OTP resent', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-green-600 dark:text-green-400">Password reset successfully!</p>
        <Link href="/login" className="inline-block text-sm text-[var(--text-primary)] hover:underline border border-[var(--border)] rounded-brutal px-6 py-2">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <form onSubmit={handleReset} className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Enter the 6-digit code sent to <strong>{email}</strong> and your new password.
        </p>
        {error && (
          <div className="text-sm text-red-500 border border-red-500/40 px-4 py-2">{error}</div>
        )}
        <Input
          label="OTP Code"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          required
          maxLength={6}
        />
        <Input
          label="New Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" loading={submitLoading} className="w-full">
          Reset Password
        </Button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="space-y-4">
      <p className="text-sm text-[var(--text-secondary)] mb-2">
        Enter your email and we&apos;ll send a 6-digit code to reset your password.
      </p>
      {error && (
        <div className="text-sm text-red-500 border border-red-500/40 px-4 py-2">{error}</div>
      )}
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <Button type="submit" loading={loading} className="w-full">
        Send OTP
      </Button>
      <Link href="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] block text-center">
        Back to sign in
      </Link>
    </form>
  );
}
