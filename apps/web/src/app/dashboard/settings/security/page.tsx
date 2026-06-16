'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Button';
import { Collapse } from '@/components/ui/Collapse';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthProvider';
import { use2FA } from '@/hooks/use2FA';
import { useRecoveryCodes } from '@/hooks/useRecoveryCodes';
import { startRegistration } from '@simplewebauthn/browser';
import { usePasskey } from '@/hooks/usePasskey';
import { useSessions } from '@/hooks/useSessions';
import { apiClient, ENDPOINTS, clearTokens } from '@/lib/api-client';
import { useOtpResend } from '@/hooks/useOtpResend';

export default function SecuritySettings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // ─── 2FA ────────────────────────────────────────────────
  const { generateSecret, enable, disable, loading: tfaLoading } = use2FA();
  const { generate: genRecoveryCodes, loading: rcLoading } = useRecoveryCodes();
  const [tfaEnabled, setTfaEnabled] = useState(user?.totpEnabled ?? false);
  const [secretKey, setSecretKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    setTfaEnabled(user?.totpEnabled ?? false);
  }, [user]);

  const handleTfaToggle = async (enable_: boolean) => {
    if (enable_) {
      try {
        const { qrCodeUrl: qr, secret } = await generateSecret();
        setQrCodeUrl(qr);
        setSecretKey(secret);
        setShowQr(true);
      } catch (err: any) {
        toast(err.message, 'error');
      }
    } else {
      setShowQr(true);
    }
  };

  const handleTfaConfirm = async () => {
    const currentlyEnabled = user?.totpEnabled;
    try {
      if (currentlyEnabled) {
        await disable(totpToken);
        toast('2FA disabled', 'success');
      } else {
        await enable(totpToken);
        toast('2FA enabled', 'success');
      }
      setShowQr(false);
      setTotpToken('');
      refreshUser();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const handleRecoveryCodes = async () => {
    try {
      const { codes: newCodes } = await genRecoveryCodes();
      setCodes(newCodes);
      setShowCodes(true);
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  // ─── Passkeys ────────────────────────────────────────────
  const { registerBegin, registerComplete, listPasskeys, deletePasskey, updatePasskeyName } = usePasskey();
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadPasskeys = async () => {
    try { setPasskeyLoading(true); setPasskeys(await listPasskeys()); } finally { setPasskeyLoading(false); }
  };

  useEffect(() => { loadPasskeys(); }, []);

  const handleAddPasskey = async () => {
    try {
      const { challengeId, options } = await registerBegin(user?.displayName || user?.email);
      const credential = await startRegistration(options);
      await registerComplete(challengeId, credential, user?.displayName || 'Passkey');
      toast('Passkey added', 'success');
      loadPasskeys();
    } catch (err: any) { toast(err.message, 'error'); }
  };

  const handleDeletePasskey = async (id: string) => {
    try { await deletePasskey(id); toast('Passkey removed', 'info'); loadPasskeys(); } catch {}
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try { await updatePasskeyName(id, renameValue); toast('Passkey renamed', 'success'); setRenamingId(null); loadPasskeys(); } catch {}
  };

  // ─── Sessions ────────────────────────────────────────────
  const { sessions, loading: sessLoading, listSessions, revokeSession } = useSessions();
  useEffect(() => { listSessions(); }, []);

  // ─── Change / Set Password ─────────────────────────────
  const hasPassword = user?.hasPassword ?? false;
  const [cp, setCp] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [cpLoading, setCpLoading] = useState(false);
  const [setPw, setSetPw] = useState({ newPassword: '', confirmPassword: '' });
  const [setPwLoading, setSetPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cp.newPassword !== cp.confirmPassword) { toast('Passwords do not match', 'error'); return; }
    setCpLoading(true);
    try {
      await apiClient.post(ENDPOINTS.changePassword, { currentPassword: cp.currentPassword, newPassword: cp.newPassword });
      toast('Password changed', 'success');
      setCp({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { toast(err.message, 'error'); } finally { setCpLoading(false); }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setPw.newPassword !== setPw.confirmPassword) { toast('Passwords do not match', 'error'); return; }
    setSetPwLoading(true);
    try {
      await apiClient.post(ENDPOINTS.setPassword, { newPassword: setPw.newPassword });
      toast('Password set successfully', 'success');
      setSetPw({ newPassword: '', confirmPassword: '' });
    } catch (err: any) { toast(err.message, 'error'); } finally { setSetPwLoading(false); }
  };

  // ─── Email Change with OTP ────────────────────────────
  const [newEmail, setNewEmail] = useState('');
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'done'>('idle');
  const [otp, setOtp] = useState('');
  const { cooldown, loading: emailLoading, setLoading: setEmailLoading, startCooldown } = useOtpResend();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleEmailChangeRequest = async () => {
    setEmailLoading(true);
    try {
      await apiClient.post(ENDPOINTS.emailChangeRequest, { newEmail });
      setOtpStep('sent');
      startCooldown();
      toast('OTP sent', 'info');
    } catch (err: any) { toast(err.message, 'error'); } finally { setEmailLoading(false); }
  };

  const handleEmailChangeConfirm = async () => {
    setConfirmLoading(true);
    try {
      await apiClient.post(ENDPOINTS.emailChangeConfirm, { otp, newEmail });
      setOtpStep('done');
      toast('Email changed successfully', 'success');
    } catch (err: any) { toast(err.message, 'error'); } finally { setConfirmLoading(false); }
  };

  const handleResendEmailOtp = async () => {
    setEmailLoading(true);
    try {
      await apiClient.post(ENDPOINTS.emailChangeRequest, { newEmail });
      startCooldown();
      toast('OTP resent', 'success');
    } catch (err: any) { toast(err.message, 'error'); } finally { setEmailLoading(false); }
  };

  // ─── Delete Account ──────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'delete my account') return;
    setDeleteLoading(true);
    try {
      await apiClient.post(ENDPOINTS.deleteAccount, hasPassword ? { password: deletePw } : {});
      toast('Account scheduled for deletion', 'info');
      setDeleteModal(false);
      setTimeout(() => { clearTokens(); location.assign('/'); }, 2000);
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Google Connect / Disconnect ──────────────────────
  const [googleConflict, setGoogleConflict] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState('');
  const [disconnectPw, setDisconnectPw] = useState('');
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      const { linkToken } = await apiClient.post<{ linkToken: string }>(ENDPOINTS.googleLinkToken, {});
      window.location.href = `/api/v1/auth/google/authorize?linkToken=${linkToken}`;
    } catch (err: any) {
      if (err.message?.includes('already linked to another account')) {
        setGoogleConflict(true);
      } else {
        toast(err.message, 'error');
      }
    }
  };

  const handleDisconnectGoogle = async () => {
    if (disconnectConfirm !== 'disconnect') return;
    setDisconnectLoading(true);
    try {
      if (!hasPassword && disconnectPw) {
        await apiClient.post(ENDPOINTS.setPassword, { newPassword: disconnectPw });
      }
      await apiClient.post(ENDPOINTS.googleDisconnect, {});
      await refreshUser();
      setDisconnectModal(false);
      setDisconnectConfirm('');
      setDisconnectPw('');
      toast('Google account disconnected', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setDisconnectLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Security</h1>
        <p className="text-sm text-[var(--text-secondary)]">Manage your account security settings.</p>
      </div>

      {/* ─── Change / Set Password ────────────────────── */}
      {hasPassword ? (
        <Card>
          <Collapse title="Change Password">
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
              <Input label="Current Password" type="password" value={cp.currentPassword} onChange={(e) => setCp((p) => ({ ...p, currentPassword: e.target.value }))} required />
              <Input label="New Password" type="password" value={cp.newPassword} onChange={(e) => setCp((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <Input label="Confirm New Password" type="password" value={cp.confirmPassword} onChange={(e) => setCp((p) => ({ ...p, confirmPassword: e.target.value }))} required />
              <Button type="submit" loading={cpLoading}>Update Password</Button>
            </form>
          </Collapse>
        </Card>
      ) : (
        <Card>
          <Collapse title="Set Password">
            <p className="text-xs text-[var(--text-muted)] mb-4">
              You signed in with Google or a passkey. Set a password to also sign in with email.
            </p>
            <form onSubmit={handleSetPassword} className="space-y-3 max-w-sm">
              <Input label="New Password" type="password" value={setPw.newPassword} onChange={(e) => setSetPw((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
              <Input label="Confirm Password" type="password" value={setPw.confirmPassword} onChange={(e) => setSetPw((p) => ({ ...p, confirmPassword: e.target.value }))} required />
              <Button type="submit" loading={setPwLoading}>Set Password</Button>
            </form>
          </Collapse>
        </Card>
      )}

      {/* ─── Change Email ──────────────────────────────── */}
      <Card>
        <Collapse title="Email">
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Current: <span className="font-mono">{user?.email}</span>
          </p>
          {otpStep === 'idle' && (
            <div className="space-y-3 max-w-sm">
              {user?.email?.includes('@passkey.frestell.com') && (
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  Add a recovery email to regain access if you lose your devices.
                </p>
              )}
              <Input label="New Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" required />
              <Button onClick={handleEmailChangeRequest} loading={emailLoading}>Send OTP</Button>
            </div>
          )}
          {otpStep === 'sent' && (
            <div className="space-y-3 max-w-sm">
              <p className="text-xs text-[var(--text-muted)]">A 6-digit OTP was sent to your new email. Enter it below.</p>
              <Input label="OTP Code" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" inputMode="numeric" />
              <Button onClick={handleEmailChangeConfirm} loading={confirmLoading}>Confirm Email Change</Button>
              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={cooldown > 0 || emailLoading}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 block"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          )}
          {otpStep === 'done' && (
            <p className="text-sm text-green-600 dark:text-green-400">Email updated successfully!</p>
          )}
        </Collapse>
      </Card>

      {/* ─── Two-Factor Authentication ────────────────── */}
      <Card>
        <Collapse title="Two-Factor Authentication" defaultOpen>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Add an extra layer of security with TOTP.</p>
            </div>
            <Switch checked={tfaEnabled} onChange={handleTfaToggle} disabled={tfaLoading} />
          </div>

          {tfaEnabled && (
            <Button variant="secondary" size="sm" onClick={handleRecoveryCodes} loading={rcLoading}>
              Generate Recovery Codes
            </Button>
          )}

          {user?.totpEnabled && <Badge variant="success" className="mt-3">Enabled</Badge>}
        </Collapse>
      </Card>

      {/* ─── Passkeys ─────────────────────────────────── */}
      <Card>
        <Collapse title="Passkeys">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--text-muted)]">Sign in with your device biometrics or PIN.</p>
            <Button variant="secondary" size="sm" onClick={handleAddPasskey} disabled={passkeyLoading}>
              Add Passkey
            </Button>
          </div>
          {passkeyLoading && <Spinner />}
          {!passkeyLoading && passkeys.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">No passkeys registered.</p>
          )}
          {passkeys.map((pk: any) => (
            <div key={pk.id} className="flex items-center justify-between py-2 border-t border-[var(--border)] text-sm">
              {renamingId === pk.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    className="input-bw px-2 py-1 text-sm w-40 radius-brutal"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(pk.id)}
                    autoFocus
                  />
                  <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => { handleRename(pk.id); }}>save</button>
                  <button className="text-xs text-[var(--text-muted)]" onClick={() => setRenamingId(null)}>cancel</button>
                </div>
              ) : (
                <span onClick={() => { setRenamingId(pk.id); setRenameValue(pk.name || 'Passkey'); }} className="cursor-pointer hover:text-[var(--text-primary)]">
                  {pk.name || 'Passkey'}
                </span>
              )}
              <button onClick={() => handleDeletePasskey(pk.id)} className="text-xs text-red-500 hover:text-red-400">&times;</button>
            </div>
          ))}
        </Collapse>
      </Card>

      {/* ─── Google Account ────────────────────────────── */}
      <Card>
        <Collapse title="Google Account">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              {user?.googleId
                ? `Connected as ${user.displayName || user.email}`
                : 'Link your Google account for easy sign-in.'}
            </p>
            <div className="flex gap-2 items-center">
              {user?.googleId ? (
                <>
                  <Badge variant="success">Connected</Badge>
                  <button
                    onClick={() => setDisconnectModal(true)}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleConnectGoogle}>
                  Connect Google
                </Button>
              )}
            </div>
          </div>
        </Collapse>
      </Card>

      {/* ─── Sessions ─────────────────────────────────── */}
      <Card>
        <Collapse title="Active Sessions">
          {sessLoading && <Spinner />}
          {!sessLoading && sessions.length === 0 && <p className="text-xs text-[var(--text-muted)]">No active sessions.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 border-t border-[var(--border)] text-sm">
              <div className="flex-1 min-w-0">
                <div className="truncate">{s.deviceInfo || 'Unknown device'}</div>
                <div className="text-xs text-[var(--text-muted)]">{s.ip || '\u2014'} &middot; {new Date(s.createdAt).toLocaleDateString()}</div>
              </div>
              {s.isCurrent ? (
                <Badge variant="info">Current</Badge>
              ) : (
                <button onClick={() => revokeSession(s.id)} className="text-xs text-red-500 hover:text-red-400">Revoke</button>
              )}
            </div>
          ))}
        </Collapse>
      </Card>

      {/* ─── 2FA Confirm Modal ─────────────────────────── */}
      <Modal open={showQr} onClose={() => { setShowQr(false); setSecretKey(''); setTotpToken(''); }} title={tfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}>
        <div className="space-y-4">
          {!tfaEnabled && qrCodeUrl && (
            <>
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
              </div>
              {secretKey && (
                <div className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Or manually enter this key in your authenticator app:</p>
                  <div className="input-bw px-3 py-2 text-xs font-mono break-all select-all cursor-text radius-brutal">
                    {secretKey}
                  </div>
                </div>
              )}
            </>
          )}
          <Input label="Authenticator Code" value={totpToken} onChange={(e) => setTotpToken(e.target.value)} placeholder="000000" inputMode="numeric" />
          <Button onClick={handleTfaConfirm} loading={tfaLoading} className="w-full">
            {tfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
      </Modal>

      {/* ─── Recovery Codes Modal ──────────────────────── */}
      <Modal open={showCodes} onClose={() => setShowCodes(false)} title="Recovery Codes">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Save these one-time codes somewhere safe. You can use them to access your account if you lose your 2FA device.
          </p>
          <div className="card-bw p-4 font-mono text-sm space-y-1">
            {codes.map((c, i) => (
              <div key={i} className="tracking-wider">{c}</div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setShowCodes(false)} className="w-full">
            I&apos;ve saved these
          </Button>
        </div>
      </Modal>

      {/* ─── Google Conflict Modal ──────────────────────── */}
      <Modal open={googleConflict} onClose={() => setGoogleConflict(false)} title="Google Account Already in Use">
        <div className="space-y-4">
          <div className="border border-red-500/40 bg-red-500/5 radius-brutal px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">This Google account cannot be connected</p>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            The Google account you tried to connect is already linked to another FreStell account.
            Each Google account can only be associated with one FreStell profile.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            If you&apos;re trying to access an existing account, sign in with that Google account directly. 
            To use a different Google account, sign out of Google and choose the correct account.
          </p>
          <Button variant="secondary" onClick={() => setGoogleConflict(false)} className="w-full">
            Got it
          </Button>
        </div>
      </Modal>

      {/* ─── Google Disconnect Confirmation Modal ──────── */}
      <Modal open={disconnectModal} onClose={() => { setDisconnectModal(false); setDisconnectConfirm(''); setDisconnectPw(''); }} title="Disconnect Google Account">
        <div className="space-y-4">
          <div className="border border-red-500/40 bg-red-500/5 radius-brutal px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {hasPassword
                ? 'Are you sure you want to disconnect your Google account?'
                : 'You have no password set. Please add a password before disconnecting.'}
            </p>
          </div>

          {!hasPassword && (
            <p className="text-sm text-[var(--text-secondary)]">
              Since you signed in with Google, you need to set a password first so you can still sign in.
            </p>
          )}

          <div className="space-y-3">
            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
            />

            {!hasPassword && (
              <Input
                label="New Password"
                type="password"
                value={disconnectPw}
                onChange={(e) => setDisconnectPw(e.target.value)}
                placeholder="Enter a new password"
                required
                minLength={8}
              />
            )}

            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">
                Type <span className="font-mono font-bold text-[var(--text-primary)]">disconnect</span> to confirm
              </label>
              <input
                className="input-bw w-full px-3 py-2 text-sm radius-brutal"
                value={disconnectConfirm}
                onChange={(e) => setDisconnectConfirm(e.target.value)}
                placeholder='Type "disconnect"'
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setDisconnectModal(false); setDisconnectConfirm(''); setDisconnectPw(''); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisconnectGoogle}
              disabled={disconnectConfirm !== 'disconnect' || (!hasPassword && disconnectPw.length < 8)}
              loading={disconnectLoading}
              className="flex-1"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Account ──────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Delete Account</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Permanently delete your account and all associated data. You have 30 days to restore it.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteModal(true)}
            className="!text-red-500 !border-red-500/40 hover:!bg-red-500/5 shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </Card>

      {/* ─── Delete Account Confirmation Modal ──────────── */}
      <Modal open={deleteModal} onClose={() => { setDeleteModal(false); setDeleteConfirm(''); setDeletePw(''); }} title="Delete Account">
        <div className="space-y-4">
          <div className="border border-red-500/40 bg-red-500/5 radius-brutal px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              This action cannot be undone. Your account will be scheduled for deletion.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Your profile, jobs, proposals, and all data will be permanently removed after 30 days.
              You can restore your account by signing in within that period.
            </p>

            {hasPassword && (
              <Input
                label="Current Password"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                placeholder="Enter your password"
                required
              />
            )}

            <div className="space-y-1">
              <label className="text-xs text-[var(--text-muted)]">
                Type <span className="font-mono font-bold text-[var(--text-primary)]">delete my account</span> to confirm
              </label>
              <input
                className="input-bw w-full px-3 py-2 text-sm radius-brutal"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "delete my account"'
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setDeleteModal(false); setDeleteConfirm(''); setDeletePw(''); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'delete my account' || (hasPassword && deletePw.length < 8)}
              loading={deleteLoading}
              className="flex-1 !text-red-500 !border-red-500/40 hover:!bg-red-500/5"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
