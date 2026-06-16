'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { stripHtml, truncate } from '@/lib/html';

export default function FindWorkPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await apiClient.get(ENDPOINTS.jobs);
        setJobs(Array.isArray(data) ? data : data.jobs || []);
      } catch {
        toast('No jobs available yet', 'info');
      } finally { setLoading(false); }
    };
    fetchJobs();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Available Jobs</h2>
        {loading && <p className="text-xs text-[var(--text-muted)]">Loading...</p>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No jobs posted yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Check back later or post a job yourself.</p>
          </div>
        )}
        {jobs.map((job: any) => (
          <div key={job.id} className="border-t border-[var(--border)] py-4 first:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{job.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{truncate(stripHtml(job.description), 200)}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  {job.budgetType === 'hourly' ? (
                    <span>${job.budgetHoursMin ?? '?'}/hr - ${job.budgetHoursMax ?? '?'}/hr</span>
                  ) : (
                    <span>${job.budgetAmount} {job.budgetAsset || 'USD'} fixed</span>
                  )}
                  {job.deadline && <span>Due {new Date(job.deadline).toLocaleDateString()}</span>}
                  {job.status && <Badge variant={job.status === 'active' ? 'success' : 'default'}>{job.status}</Badge>}
                </div>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0">View</Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
