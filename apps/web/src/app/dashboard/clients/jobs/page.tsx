'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { stripHtml, truncate } from '@/lib/html';

type ConfirmAction = {
  id: string;
  title: string;
  type: 'cancel' | 'archive' | 'permanent';
};

export default function MyJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get('/jobs/mine');
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch {
      toast('No jobs posted yet', 'info');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handlePause = async (jobId: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/jobs/${jobId}/pause`);
      toast('Job paused — no new applications', 'success');
      await fetchJobs();
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const handleResume = async (jobId: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/jobs/${jobId}/resume`);
      toast('Job resumed — accepting applications', 'success');
      await fetchJobs();
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiClient.delete(`/jobs/${confirm.id}`);
      toast(
        confirm.type === 'permanent' ? 'Deleted permanently' :
        confirm.type === 'archive' ? 'Archived' : 'Cancelled',
        'success',
      );
      setJobs((prev) => prev.filter((j) => j.id !== confirm.id));
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
    finally { setBusy(false); setConfirm(null); }
  };

  const handleDuplicate = async (jobId: string) => {
    try {
      const dup = await apiClient.post(`/jobs/${jobId}/duplicate`);
      setJobs((prev) => [dup, ...prev]);
      toast('Job duplicated', 'success');
    } catch (err: any) { toast(err.message || 'Failed to duplicate', 'error'); }
  };

  const badgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'review': return 'info';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'archived': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const confirmTitle = confirm?.type === 'permanent' ? 'Delete permanently' :
    confirm?.type === 'archive' ? 'Archive' : 'Cancel job';

  const confirmMessage = confirm ? {
    cancel: `Cancel "${confirm.title}"? ${confirm.type === 'cancel' ? 'Freelancers can no longer apply.' : ''}`,
    archive: `Archive "${confirm.title}"? It will be moved to archived.`,
    permanent: `Permanently delete "${confirm.title}"? This cannot be undone.`,
  }[confirm.type] : '';

  const confirmButton = confirm?.type === 'permanent' ? 'Delete' :
    confirm?.type === 'archive' ? 'Archive' : 'Cancel';

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">My Jobs</h2>
          <Link href="/dashboard/clients/post">
            <Button size="sm">Post a Job</Button>
          </Link>
        </div>
        {loading && <p className="text-xs text-[var(--text-muted)]">Loading...</p>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">No jobs posted yet.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Create your first job listing to start hiring.</p>
          </div>
        )}
        {jobs.map((job: any) => {
          const activeStatuses = ['active', 'review', 'in_progress'];
          const isPausable = activeStatuses.includes(job.status);
          const isPaused = job.visibility === 'hidden';
          const duplicatable = job.status === 'draft' || job.status === 'active';
          const hasProposals = job.status === 'active' && job.proposalsCount > 0;
          return (
          <div key={job.id} className="border-t border-[var(--border)] py-4 first:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{job.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{truncate(stripHtml(job.description), 200)}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  {job.budgetType === 'hourly' ? (
                    <span>${Number(job.budgetHoursMin ?? 0).toFixed(2)}/hr - ${Number(job.budgetHoursMax ?? 0).toFixed(2)}/hr</span>
                  ) : job.budgetType === 'milestone' ? (
                    <span>${Number(job.budgetAmount).toFixed(2)} milestone-based</span>
                  ) : (
                    <span>${Number(job.budgetAmount).toFixed(2)} {job.budgetAsset || 'USDC'}</span>
                  )}
                  {job.deadline && <span>Due {new Date(job.deadline).toLocaleDateString()}</span>}
                  <Badge variant={badgeVariant(job.status)}>{job.status.replace('_', ' ')}</Badge>
                  {isPaused && <Badge variant="default">paused</Badge>}
                  {job.proposalsCount !== undefined && (
                    <span>{job.proposalsCount} proposal{job.proposalsCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {duplicatable && <Button size="sm" variant="secondary" onClick={() => handleDuplicate(job.id)} disabled={busy}>Duplicate</Button>}
                {hasProposals && (
                  <Link href={`/dashboard/clients/jobs/${job.id}/proposals`}><Button variant="secondary" size="sm">Review</Button></Link>
                )}
                <Link href={`/dashboard/clients/jobs/${job.id}/analytics`}><Button size="sm" variant="secondary">Analytics</Button></Link>

                {/* Pause / Resume — active jobs only */}
                {isPausable && !isPaused && (
                  <Button size="sm" variant="secondary" onClick={() => handlePause(job.id)} disabled={busy}>Pause</Button>
                )}
                {isPausable && isPaused && (
                  <Button size="sm" variant="secondary" onClick={() => handleResume(job.id)} disabled={busy}>Resume</Button>
                )}

                {/* Cancel — active jobs only */}
                {isPausable && (
                  <Button size="sm" variant="secondary" onClick={() => setConfirm({ id: job.id, title: job.title, type: 'cancel' })}>Cancel</Button>
                )}

                {/* Archive — completed */}
                {job.status === 'completed' && (
                  <Button size="sm" variant="secondary" onClick={() => setConfirm({ id: job.id, title: job.title, type: 'archive' })}>Archive</Button>
                )}

                {/* Delete permanently — draft / archived / cancelled */}
                {['draft', 'archived', 'cancelled'].includes(job.status) && (
                  <Button size="sm" variant="danger" onClick={() => setConfirm({ id: job.id, title: job.title, type: 'permanent' })}>Delete permanently</Button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </Card>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirmTitle}>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{confirmMessage}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setConfirm(null)} disabled={busy}>Keep</Button>
          <Button size="sm" variant={confirm?.type === 'permanent' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>{confirmButton}</Button>
        </div>
      </Modal>
    </div>
  );
}
