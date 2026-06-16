'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { apiClient, ENDPOINTS, setTokens } from '@/lib/api-client';
import { useOtpResend } from '@/hooks/useOtpResend';
import { startRegistration } from '@simplewebauthn/browser';
import { GoogleSignInButton } from './GoogleSignInButton';

export function SignupForm() {
  const router = useRouter();
  const { register, refreshUser } = useAuth();
  const { toast } = useToast();
  const { cooldown, loading: resendLoading, setLoading: setResendLoading, startCooldown } = useOtpResend();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Passkey signup state
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyStep, setPasskeyStep] = useState<'idle' | 'creating' | 'name'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true); setError('');
    try {
      await register({ email, password, displayName: displayName || undefined });
      setShowOtp(true);
      startCooldown();
      toast('Verification code sent to your email', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setVerifyLoading(true); setError('');
    try {
      const data = await apiClient.post<{ user: any; tokens: { accessToken: string; refreshToken: string } }>(
        ENDPOINTS.verifyEmail,
        { otp },
        { skipAuth: true },
      );
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      await refreshUser();
      toast('Email verified! Welcome to FreStell.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      await apiClient.post(ENDPOINTS.resendVerification, { email }, { skipAuth: true });
      startCooldown();
      toast('Code resent', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handlePasskeySignup = async () => {
    setPasskeyStep('creating'); setPasskeyLoading(true); setError('');

    try {
      const { challengeId, options } = await apiClient.post<{ challengeId: string; options: any }>(
        '/auth/passkey/signup/begin', { displayName: displayName || undefined }, { skipAuth: true },
      );

      const credential = await startRegistration(options);
      setPasskeyStep('name');
      if (displayName && !passkeyName) setPasskeyName(displayName);

      (window as any).__passkeySignup = { challengeId, credential };
    } catch (err: any) {
      setError(err.message);
      setPasskeyStep('idle');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyComplete = async () => {
    const data = (window as any).__passkeySignup;
    if (!data) { setError('Session expired, try again'); setPasskeyStep('idle'); return; }

    setPasskeyLoading(true);
    try {
      const result = await apiClient.post<{ user: any; tokens: { accessToken: string; refreshToken: string } }>(
        '/auth/passkey/signup/complete',
        { challengeId: data.challengeId, credential: data.credential, name: passkeyName || undefined },
        { skipAuth: true },
      );
      setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      await refreshUser();
      delete (window as any).__passkeySignup;
      toast('Account created! Add a recovery email in Settings.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  if (passkeyStep === 'name') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); handlePasskeyComplete(); }} className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Passkey created! Give your account a name (optional).
        </p>
        <Input
          label="Display Name"
          type="text"
          value={passkeyName}
          onChange={(e) => setPasskeyName(e.target.value)}
          placeholder="Your name (optional)"
          autoComplete="name"
        />
        <p className="text-xs text-[var(--text-muted)]">
          You can add a recovery email later in Settings.
        </p>
        {error && (
          <div className="text-sm text-red-500 border border-red-500/40 px-4 py-2">{error}</div>
        )}
        <Button type="submit" loading={passkeyLoading} className="w-full">
          Complete Sign Up
        </Button>
      </form>
    );
  }

  if (showOtp) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-500 border border-red-500/40 px-4 py-2">{error}</div>
        )}

        <p className="text-sm text-[var(--text-secondary)] text-center">
          We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below to verify your account.
        </p>

        <Input
          label="Verification Code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
        />

        <p className="text-xs text-[var(--text-muted)] text-center">
          This code expires in 15 minutes. If you don't verify in time, your account will be deleted.
        </p>

        <Button onClick={handleVerifyOtp} loading={verifyLoading} className="w-full" disabled={otp.length !== 6}>
          Verify Email
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={cooldown > 0 || resendLoading}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <Input
        label="Display Name (optional)"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 8 characters"
        required
        autoComplete="new-password"
        minLength={8}
      />

      <Button type="submit" loading={loading} className="w-full">
        Create Account
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)]">or</span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={handlePasskeySignup}
        loading={passkeyLoading}
        className="w-full"
      >
        Continue with Passkey
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)]">or</span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>

      <GoogleSignInButton />

      <p className="text-xs text-center text-[var(--text-muted)] pt-1">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--text-primary)] hover:underline">Sign in</Link>
      </p>
    </form>
  );
}