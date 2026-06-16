'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';

function getStatusColor(status: string) {
  switch (status) {
    case 'shortlisted': return 'info';
    case 'rejected': return 'error';
    case 'accepted': return 'success';
    case 'withdrawn': return 'warning';
    default: return 'default';
  }
}

export default function MyApplicationsPage() {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const data = await apiClient.get('/jobs/proposals/mine');
        setProposals(Array.isArray(data) ? data : data.proposals || []);
      } catch {
        toast('No applications yet', 'info');
      } finally { setLoading(false); }
    };
    fetchProposals();
  }, []);

  const handleWithdraw = async (proposalId: string) => {
    try {
      await apiClient.post(`/jobs/proposals/${proposalId}/withdraw`);
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: 'withdrawn' } : p)),
      );
      toast('Application withdrawn', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to withdraw', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">My Applications</h2>
        {loading && <p className="text-xs text-[var(--text-muted)]">Loading...</p>}
        {!loading && proposals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No applications yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Browse available jobs and submit your first proposal.</p>
          </div>
        )}
        {proposals.map((p: any) => (
          <div key={p.id} className="border-t border-[var(--border)] py-4 first:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{p.job?.title || 'Untitled Job'}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{p.body}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  {p.bidAmount > 0 && <span>Bid: ${Number(p.bidAmount).toFixed(2)}</span>}
                  <span>Applied {new Date(p.submittedAt).toLocaleDateString()}</span>
                  <Badge variant={getStatusColor(p.status)}>{p.status}</Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.status === 'submitted' && (
                  <Button size="sm" variant="secondary" onClick={() => handleWithdraw(p.id)}>
                    Withdraw
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
