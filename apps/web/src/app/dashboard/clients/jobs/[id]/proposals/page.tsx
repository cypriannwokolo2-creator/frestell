'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { useParams, useRouter } from 'next/navigation';

function getStatusColor(status: string) {
  switch (status) {
    case 'shortlisted': return 'info';
    case 'rejected': return 'error';
    case 'accepted': return 'success';
    default: return 'default';
  }
}

export default function ReviewProposalsPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [jobData, proposalsData] = await Promise.all([
          apiClient.get(`/jobs/${jobId}`),
          apiClient.get(`/jobs/${jobId}/proposals`),
        ]);
        setJob(jobData);
        setProposals(Array.isArray(proposalsData) ? proposalsData : proposalsData.proposals || []);
      } catch {
        toast('Failed to load proposals', 'error');
      } finally { setLoading(false); }
    };
    fetch();
  }, [jobId]);

  const updateStatus = async (proposalId: string, status: string) => {
    try {
      await apiClient.patch(`/jobs/${jobId}/proposals/${proposalId}`, { status });
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status } : p)),
      );
      toast(`Proposal ${status}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-xs text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2">&larr; Back to My Jobs</button>
        <h1 className="text-2xl font-bold">{job?.title || 'Job'}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received
        </p>
      </div>

      {proposals.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No proposals yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Proposals will appear here once freelancers apply.</p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {proposals.map((p: any) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {p.freelancer?.avatarUrl && (
                    <img src={p.freelancer.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">{p.freelancer?.displayName || 'Unknown'}</h3>
                    <span className="text-xs text-[var(--text-muted)]">Bid: ${Number(p.bidAmount).toFixed(2)} {p.bidAsset}</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{p.body}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
                  <span>Submitted {new Date(p.submittedAt).toLocaleDateString()}</span>
                  <Badge variant={getStatusColor(p.status)}>{p.status}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {p.status === 'submitted' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(p.id, 'shortlisted')}>Shortlist</Button>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(p.id, 'rejected')}>Reject</Button>
                  </>
                )}
                {p.status === 'shortlisted' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(p.id, 'accepted')}>Accept</Button>
                    <Button size="sm" variant="secondary" onClick={() => updateStatus(p.id, 'rejected')}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
