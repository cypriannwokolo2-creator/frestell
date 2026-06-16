'use client';

import { useState, useEffect, useCallback } from 'react';

const SCHEDULE = [30, 60, 120, 240];

export function useOtpResend() {
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);

  const nextWait = () => SCHEDULE[Math.min(attempts, SCHEDULE.length - 1)];

  const startCooldown = useCallback(() => {
    setCooldown(nextWait());
    setAttempts((a) => a + 1);
  }, [attempts]);

  return { cooldown, loading, setLoading, startCooldown };
}
