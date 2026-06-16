import { useState, useCallback } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export function use2FA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSecret = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      return await apiClient.post<{ secret: string; qrCodeUrl: string }>(ENDPOINTS.twoFactorGenerate);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const enable = useCallback(async (token: string) => {
    setLoading(true); setError(null);
    try {
      await apiClient.post(ENDPOINTS.twoFactorEnable, { token });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async (token: string) => {
    setLoading(true); setError(null);
    try {
      await apiClient.post(ENDPOINTS.twoFactorDisable, { token });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const status = useCallback(async () => {
    return apiClient.get<{ enabled: boolean; verifiedAt: string | null }>(ENDPOINTS.twoFactorStatus);
  }, []);

  return { generateSecret, enable, disable, status, loading, error };
}
