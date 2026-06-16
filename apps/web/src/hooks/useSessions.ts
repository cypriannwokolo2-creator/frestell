import { useState, useCallback } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

interface Session {
  id: string;
  deviceInfo: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const listSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Session[]>(ENDPOINTS.sessions);
      setSessions(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    await apiClient.delete(`${ENDPOINTS.sessions}/${sessionId}`);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  return { sessions, loading, listSessions, revokeSession };
}
