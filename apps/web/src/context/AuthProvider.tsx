'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient, setTokens, clearTokens, getAccessToken, ENDPOINTS } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'freelancer' | 'client' | 'admin';
  tier: string;
  hasPasskey: boolean;
  totpEnabled: boolean;
  emailVerified: boolean;
  googleId: string | null;
  hasPassword: boolean;
  deletedAt: string | null;
  restoreUntil: string | null;
  avatarUrl?: string | null;
  slug?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, totpToken?: string, twoFactorEmailOtp?: string, recoveryCode?: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName?: string; role?: string }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not ready'); },
  register: async () => { return { message: '' }; },
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) { setUser(null); return; }
      const data = await apiClient.post(ENDPOINTS.me);
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, totpToken?: string, twoFactorEmailOtp?: string, recoveryCode?: string) => {
    const data = await apiClient.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
      ENDPOINTS.login,
      { email, password, totpToken, twoFactorEmailOtp, recoveryCode },
      { skipAuth: true },
    );
    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    setUser(data.user);
  };

  const register = async (regData: { email: string; password: string; displayName?: string; role?: string }) => {
    const data = await apiClient.post<{ message: string }>(
      ENDPOINTS.register,
      regData,
      { skipAuth: true },
    );
    return data;
  };

  const logout = async () => {
    try { await apiClient.post(ENDPOINTS.logout, {}); } catch {}
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
