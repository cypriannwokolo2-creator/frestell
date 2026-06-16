const API_BASE = '/api/v1';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  formData?: boolean;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('access_token');
  }
  return accessToken;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken && typeof window !== 'undefined') {
    refreshToken = localStorage.getItem('refresh_token');
  }
  if (!refreshToken) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) { clearTokens(); return false; }
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      refreshToken = data.refreshToken;
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function api<T = any>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!options.formData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const csrf = getCsrfToken();
  if (csrf) headers['x-csrf-token'] = csrf;

  // Store formData flag and remove from options before passing to fetch
  const isFormData = options.formData;
  const { formData: _, ...fetchOptions } = options;

  let res = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });

  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(url, { ...options, headers, credentials: 'include' });
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    const message = data.message || data.error || `Request failed (${res.status})`;
    const err = new Error(message) as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ─── Convenience methods ──────────────────────────────────

export const apiClient = {
  get: <T = any>(path: string, opts?: FetchOptions) => api<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, body?: any, opts?: FetchOptions) => {
    if (opts?.formData) {
      return api<T>(path, { ...opts, method: 'POST', body });
    }
    return api<T>(path, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined });
  },
  patch: <T = any>(path: string, body?: any, opts?: FetchOptions) =>
    api<T>(path, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string, opts?: FetchOptions) =>
    api<T>(path, { ...opts, method: 'DELETE' }),
};

export const ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
  changePassword: '/auth/change-password',
  passwordResetRequest: '/auth/password-reset/request',
  passwordResetConfirm: '/auth/password-reset/confirm',
  verifyEmail: '/auth/verify-email',
  resendVerification: '/auth/resend-verification',
  twoFactorGenerate: '/auth/2fa/generate',
  twoFactorEnable: '/auth/2fa/enable',
  twoFactorDisable: '/auth/2fa/disable',
  twoFactorStatus: '/auth/2fa/status',
  recoveryCodesGenerate: '/auth/recovery-codes/generate',
  recoveryCodesUse: '/auth/recovery-codes/use',
  sessions: '/auth/sessions',
  passkeyRegisterBegin: '/auth/passkey/register/begin',
  passkeyRegisterComplete: '/auth/passkey/register/complete',
  passkeyLoginBegin: '/auth/passkey/login/begin',
  passkeyLoginComplete: '/auth/passkey/login/complete',
  passkeys: '/auth/passkeys',
  setPassword: '/auth/set-password',
  emailChangeRequest: '/auth/email/change-request',
  emailChangeConfirm: '/auth/email/change-confirm',
  auditLog: '/auth/audit-log',
  googleAuth: '/auth/google',
  googleCallback: '/auth/callback',
  googleLinkToken: '/auth/google/link-token',
  googleDisconnect: '/auth/google/disconnect',
  deleteAccount: '/auth/delete-account',
  restoreAccount: '/auth/restore-account',
  sendRestoreOtp: '/auth/restore-account/send-otp',
  confirmRestoreOtp: '/auth/restore-account/confirm',

  // Profile
  myProfile: '/profile/me',
  updateProfile: '/profile/me',
  publicProfile: '/profile', // + /:slug
  profileCompleteness: '/profile/me/completeness',
  profileViews: '/profile/me/views',
  skillsTaxonomy: '/profile/skills',
  mySkills: '/profile/me/skills',
  portfolioList: '/profile/me/portfolio',
  servicesList: '/profile/me/services',
  socialLinksList: '/profile/me/social-links',
  avatarUpload: '/profile/me/avatar',
  updateAvailability: '/profile/me/availability',
  updateVisibility: '/profile/me/visibility',
  updateSlug: '/profile/me/slug',
  checkSlug: '/profile/slug/check',

  // Jobs
  jobs: '/jobs',
  myJobs: '/jobs/mine',
  myProposals: '/jobs/proposals/mine',
  jobDetail: '/jobs', // + /:id
  jobProposals: '/jobs', // + /:id/proposals
  submitProposal: '/jobs', // + /:id/proposals
  updateProposalStatus: '/jobs', // + /:id/proposals/:proposalId
  withdrawProposal: '/jobs/proposals', // + /:proposalId/withdraw
} as const;
