'use client';

import { Card } from '@/components/ui/Card';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';

export default function JobAnalyticsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/jobs/${params.id}/analytics`)
      .then(setStats)
      .catch(() => toast('Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading...</p>;
  if (!stats) return <p className="text-sm text-[var(--text-muted)]">No analytics available.</p>;

  const metrics = [
    { label: 'Views', value: stats.views, desc: 'Total job page views' },
    { label: 'Applications', value: stats.applications, desc: 'Total proposals received' },
    { label: 'Shortlisted', value: stats.shortlisted, desc: 'Proposals shortlisted' },
    { label: 'Hired', value: stats.accepted, desc: 'Proposals accepted' },
    { label: 'Shortlist Rate', value: `${stats.shortlistRate}%`, desc: 'Applications that were shortlisted' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, desc: 'Shortlisted that were hired' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Analytics</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">{stats.title}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="glass radius-brutal p-4 text-center">
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{m.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 opacity-60">{m.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
