'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient, ENDPOINTS } from '@/lib/api-client';
import { useAuth } from '@/context/AuthProvider';
import { useOtpResend } from '@/hooks/useOtpResend';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RecoveryEmailModal({ open, onClose }: Props) {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const { cooldown, loading, setLoading, startCooldown } = useOtpResend();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email) { setError('Enter an email address'); return; }
    setLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.emailChangeRequest, { newEmail: email });
      setStep('otp');
      startCooldown();
      toast('OTP sent to your new email', 'info');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setVerifyLoading(true); setError('');
    try {
      await apiClient.post(ENDPOINTS.emailChangeConfirm, { otp, newEmail: email });
      setStep('done');
      await refreshUser();
      toast('Recovery email added!', 'success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiClient.post(ENDPOINTS.emailChangeRequest, { newEmail: email });
      startCooldown();
      toast('OTP resent', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'done') onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Recovery Email">
      {step === 'email' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            You signed up with a passkey. Add a recovery email so you can regain access if you lose your devices.
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
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Skip</Button>
            <Button onClick={handleSendOtp} loading={loading}>Send OTP</Button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            A 6-digit code was sent to <strong>{email}</strong>. Enter it below.
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
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setStep('email'); setError(''); }}>Back</Button>
            <Button onClick={handleConfirmOtp} loading={verifyLoading}>Verify</Button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            Recovery email set successfully!
          </p>
          <Button onClick={onClose} className="w-full">Done</Button>
        </div>
      )}
    </Modal>
  );
}
