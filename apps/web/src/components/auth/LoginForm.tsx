'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api-client';
import { startAuthentication } from '@simplewebauthn/browser';
import { usePasskey } from '@/hooks/usePasskey';
import { useOtpResend } from '@/hooks/useOtpResend';
import { GoogleSignInButton } from './GoogleSignInButton';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const { loginBegin, loginComplete, loading: passkeyLoading } = usePasskey();
  const { cooldown, loading: emailOtpLoading, setLoading: setEmailOtpLoading, startCooldown } = useOtpResend();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [emailOtpMode, setEmailOtpMode] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(
        email,
        password,
        recoveryMode ? undefined : (emailOtpMode ? undefined : (totpToken || undefined)),
        recoveryMode ? undefined : (emailOtpMode ? emailOtp : undefined),
        recoveryMode ? recoveryCode : undefined,
      );
      toast('Signed in successfully', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      if (err.message?.includes('TOTP') || err.message?.includes('2FA') || err.message?.includes('Two-factor')) {
        setShowTotp(true);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setEmailOtpLoading(true);
    try {
      await apiClient.post('/auth/2fa/send-email-otp', { email, password }, { skipAuth: true });
      setEmailOtpMode(true);
      startCooldown();
      toast('Code sent to your email', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handlePasskey = async () => {
    try {
      const { challengeId, options } = await loginBegin(email || undefined);
      const credential = await startAuthentication(options);
      const data = await loginComplete(challengeId, credential);
      toast('Signed in with passkey', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      toast(err.message || 'Passkey sign-in failed', 'error');
    }
  };

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
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        autoComplete="current-password"
      />

      {showTotp && !emailOtpMode && !recoveryMode && (
        <>
          <Input
            label="Authenticator Code"
            type="text"
            value={totpToken}
            onChange={(e) => setTotpToken(e.target.value)}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <button
              type="button"
              onClick={handleSendEmailOtp}
              disabled={emailOtpLoading}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {emailOtpLoading ? 'Sending...' : 'Email code instead'}
            </button>
            <button
              type="button"
              onClick={() => setRecoveryMode(true)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Use recovery code
            </button>
          </div>
        </>
      )}

      {emailOtpMode && (
        <>
          <Input
            label="Email Code"
            type="text"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            required
            maxLength={6}
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEmailOtpMode(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Use authenticator app
            </button>
            <span className="text-[var(--text-muted)]">&middot;</span>
            <button
              type="button"
              onClick={handleSendEmailOtp}
              disabled={cooldown > 0 || emailOtpLoading}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <span className="text-[var(--text-muted)]">&middot;</span>
            <button
              type="button"
              onClick={() => setRecoveryMode(true)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Use recovery code
            </button>
          </div>
        </>
      )}

      {recoveryMode && (
        <>
          <Input
            label="Recovery Code"
            type="text"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="XXXXX-XXXXX"
            required
          />
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setRecoveryMode(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Use authenticator app
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" loading={loading} className="flex-1">
          {showTotp || emailOtpMode || recoveryMode ? 'Verify & Sign In' : 'Sign In'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handlePasskey}
          disabled={passkeyLoading}
        >
          Passkey
        </Button>
      </div>

      <div className="relative flex items-center gap-3 pt-2">
        <div className="flex-1 border-t border-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)]">or</span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>

      <GoogleSignInButton />

      <div className="flex items-center justify-between text-xs pt-1">
        <Link href="/forgot-password" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          Create account
        </Link>
      </div>
    </form>
  );
}
