import { useState, useCallback } from 'react';
import { apiClient, ENDPOINTS, setTokens } from '@/lib/api-client';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

export function usePasskey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerBegin = useCallback(async (displayName?: string) => {
    setLoading(true); setError(null);
    try {
      const data = await apiClient.post(ENDPOINTS.passkeyRegisterBegin, { displayName });
      return data as { challengeId: string; options: PublicKeyCredentialCreationOptionsJSON };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerComplete = useCallback(async (challengeId: string, credential: any, name?: string) => {
    setLoading(true); setError(null);
    try {
      const data = await apiClient.post(ENDPOINTS.passkeyRegisterComplete, { challengeId, credential, name });
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginBegin = useCallback(async (email?: string) => {
    setLoading(true); setError(null);
    try {
      const data = await apiClient.post(ENDPOINTS.passkeyLoginBegin, { email }, { skipAuth: true });
      return data as { challengeId: string; options: PublicKeyCredentialRequestOptionsJSON };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginComplete = useCallback(async (challengeId: string, credential: any) => {
    setLoading(true); setError(null);
    try {
      const data = await apiClient.post<{ user: any; tokens: { accessToken: string; refreshToken: string } }>(
        ENDPOINTS.passkeyLoginComplete, { challengeId, credential }, { skipAuth: true },
      );
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listPasskeys = useCallback(async () => {
    return apiClient.get(ENDPOINTS.passkeys);
  }, []);

  const updatePasskeyName = useCallback(async (passkeyId: string, name: string) => {
    return apiClient.patch(`${ENDPOINTS.passkeys}/${passkeyId}`, { passkeyId, name });
  }, []);

  const deletePasskey = useCallback(async (passkeyId: string) => {
    return apiClient.delete(`${ENDPOINTS.passkeys}/${passkeyId}`, { body: JSON.stringify({ passkeyId }) });
  }, []);

  return { registerBegin, registerComplete, loginBegin, loginComplete, listPasskeys, updatePasskeyName, deletePasskey, loading, error };
}
