import { useState, useCallback } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export function useRecoveryCodes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      return await apiClient.post<{ codes: string[]; message: string }>(ENDPOINTS.recoveryCodesGenerate);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}
