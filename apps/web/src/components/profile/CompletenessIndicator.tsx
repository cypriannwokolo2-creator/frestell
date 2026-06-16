'use client';

import { useState, useEffect } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export function CompletenessIndicator() {
  const [data, setData] = useState<{ score: number; missing: string[]; prompts: string[] } | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    apiClient.get(ENDPOINTS.profileCompleteness).then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const relevantPrompts = data.prompts.filter((_, i) => !dismissed.includes(data.missing[i]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[var(--bg-tertiary)] radius-brutal overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              data.score >= 80 ? 'bg-green-500' : data.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.score}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums">{data.score}%</span>
      </div>

      {relevantPrompts.length > 0 && (
        <div className="space-y-1">
          {data.missing.map((key, i) => {
            if (dismissed.includes(key)) return null;
            return (
              <div key={key} className="flex items-start justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>&bull; {data.prompts[i]}</span>
                <button
                  onClick={() => setDismissed((p) => [...p, key])}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
