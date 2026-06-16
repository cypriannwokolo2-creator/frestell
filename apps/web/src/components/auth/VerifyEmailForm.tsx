'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient, ENDPOINTS } from '@/lib/api-client';
import { useOtpResend } from '@/hooks/useOtpResend';

export function VerifyEmailForm() {
  const { toast } = useToast();
  const { cooldown, loading, setLoading, startCooldown } = useOtpResend();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email) return;
    setLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.resendVerification, { email }, { skipAuth: true });
      setOtpSent(true);
      startCooldown();
      toast('Verification code sent', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setVerifyLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.verifyEmail, { otp }, { skipAuth: true });
      setVerified(true);
      toast('Email verified successfully', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiClient.post(ENDPOINTS.resendVerification, { email }, { skipAuth: true });
      startCooldown();
      toast('Code resent', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-green-600 dark:text-green-400">Email verified successfully!</p>
        <Link href="/login" className="text-sm text-[var(--text-primary)] hover:underline block">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={otpSent}
      />

      {!otpSent ? (
        <Button onClick={handleSendCode} loading={loading} className="w-full">
          Send Verification Code
        </Button>
      ) : (
        <>
          <p className="text-sm text-[var(--text-secondary)] text-center">
            Enter the 6-digit code sent to <span className="font-medium">{email}</span>
          </p>

          <Input
            label="Verification Code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
          />

          <Button onClick={handleVerify} loading={verifyLoading} className="w-full" disabled={otp.length !== 6}>
            Verify Email
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </>
      )}

      <div className="text-center">
        <Link href="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}