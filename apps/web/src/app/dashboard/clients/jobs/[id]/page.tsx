'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  budgetType: 'Budget Type',
  budgetAmount: 'Budget Amount',
  budgetAsset: 'Asset',
  budgetHoursMin: 'Min Hours',
  budgetHoursMax: 'Max Hours',
  status: 'Status',
  visibility: 'Visibility',
  applicationLimit: 'Application Limit',
  deadline: 'Deadline',
  expiresAt: 'Expires At',
  categoryId: 'Category',
};

function formatValue(value: string | null) {
  if (!value) return <span className="italic text-[var(--text-muted)]">(empty)</span>;
  if (value.length > 200) return value.slice(0, 200) + '...';
  return value;
}

type ConfirmAction = {
  type: 'cancel' | 'archive' | 'permanent';
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchJob = async () => {
    try {
      const data = await apiClient.get(`/jobs/${params.id}`);
      setJob(data);
    } catch {
      toast('Failed to load job', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchJob(); }, [params.id]);

  const handlePause = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/jobs/${params.id}/pause`);
      toast('Job paused — no new applications', 'success');
      await fetchJob();
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const handleResume = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/jobs/${params.id}/resume`);
      toast('Job resumed — accepting applications', 'success');
      await fetchJob();
    } catch (err: any) { toast(err.message || 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      await apiClient.delete(`/jobs/${params.id}`);
      toast(
        confirmAction.type === 'permanent' ? 'Deleted permanently' :
        confirmAction.type === 'archive' ? 'Archived' : 'Cancelled',
        'success',
      );
      router.push('/dashboard/clients/jobs');
    } catch (err: any) {
      toast(err.message || 'Failed', 'error');
    } finally { setBusy(false); setConfirmAction(null); }
  };

  const handleDuplicate = async () => {
    try {
      const dup = await apiClient.post(`/jobs/${params.id}/duplicate`);
      toast('Job duplicated', 'success');
      router.push(`/dashboard/clients/jobs/${dup.id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to duplicate', 'error');
    }
  };

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading...</p>;
  if (!job) return <p className="text-sm text-[var(--text-muted)]">Job not found.</p>;

  const activeStatuses = ['active', 'review', 'in_progress'];
  const isPausable = activeStatuses.includes(job.status);
  const isPaused = job.visibility === 'hidden';
  const duplicatable = job.status === 'draft' || job.status === 'active';
  const editable = job.status === 'draft';
  const hasProposals = job.status === 'active' && job.proposalsCount > 0;

  const confirmMessage = confirmAction ? {
    cancel: `Cancel "${job.title}"? Freelancers can no longer apply.`,
    archive: `Archive "${job.title}"? It will be moved to archived.`,
    permanent: `Permanently delete "${job.title}"? This cannot be undone.`,
  }[confirmAction.type] : '';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{job.title}</h1>
              <Badge variant={job.status === 'active' || job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'error' : job.status === 'archived' ? 'default' : 'info'}>
                {job.status.replace('_', ' ')}
              </Badge>
              {isPaused && <Badge variant="default">paused</Badge>}
            </div>
            {job.category && <p className="text-xs text-[var(--text-secondary)] mt-1">{job.category.name}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
              {job.budgetType === 'hourly' ? (
                <span>${Number(job.budgetHoursMin ?? 0).toFixed(2)}/hr - ${Number(job.budgetHoursMax ?? 0).toFixed(2)}/hr</span>
              ) : job.budgetType === 'milestone' ? (
                <span>${Number(job.budgetAmount).toFixed(2)} milestone-based</span>
              ) : (
                <span>${Number(job.budgetAmount).toFixed(2)} {job.budgetAsset || 'USDC'}</span>
              )}
              {job.budgetType !== 'hourly' && <span>{job.budgetType}</span>}
              {job.deadline && <span>Due {new Date(job.deadline).toLocaleDateString()}</span>}
              {job.expiresAt && <span>Expires {new Date(job.expiresAt).toLocaleDateString()}</span>}
              {job.publishedAt && <span>Published {new Date(job.publishedAt).toLocaleDateString()}</span>}
              {job.proposalsCount !== undefined && (
                <span>{job.proposalsCount} proposal{job.proposalsCount !== 1 ? 's' : ''}</span>
              )}
              {job.applicationLimit && <span>Limit: {job.applicationLimit}</span>}
            </div>
            {job.tags?.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {job.tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)]">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {editable && (
              <Link href={`/dashboard/clients/post?id=${job.id}`}>
                <Button size="sm" variant="secondary">Edit</Button>
              </Link>
            )}
            {duplicatable && <Button size="sm" variant="secondary" onClick={handleDuplicate} disabled={busy}>Duplicate</Button>}
            {hasProposals && (
              <Link href={`/dashboard/clients/jobs/${job.id}/proposals`}>
                <Button size="sm">Review Proposals</Button>
              </Link>
            )}
            <Link href={`/dashboard/clients/jobs/${job.id}/analytics`}>
              <Button size="sm" variant="secondary">Analytics</Button>
            </Link>

            {/* Pause / Resume */}
            {isPausable && !isPaused && (
              <Button size="sm" variant="secondary" onClick={handlePause} disabled={busy}>Pause</Button>
            )}
            {isPausable && isPaused && (
              <Button size="sm" variant="secondary" onClick={handleResume} disabled={busy}>Resume</Button>
            )}

            {/* Cancel — active jobs */}
            {isPausable && (
              <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ type: 'cancel' })}>Cancel</Button>
            )}

            {/* Archive — completed */}
            {job.status === 'completed' && (
              <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ type: 'archive' })}>Archive</Button>
            )}

            {/* Delete permanently — draft / archived / cancelled */}
            {['draft', 'archived', 'cancelled'].includes(job.status) && (
              <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: 'permanent' })}>Delete permanently</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Description */}
      <Card title="Description">
        <div className="prose prose-sm max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-a:text-[var(--accent)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--text-primary)] prose-code:bg-[var(--bg-card)] prose-code:px-1 prose-code:rounded">
          <div dangerouslySetInnerHTML={{ __html: job.description }} />
        </div>
      </Card>

      {/* Acceptance Criteria */}
      {job.criteria?.length > 0 && (
        <Card title="Acceptance Criteria">
          <ul className="space-y-2">
            {job.criteria.map((c: any) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${c.done ? 'border-green-500 bg-green-500' : 'border-[var(--border)]'}`}>
                  {c.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </span>
                <span className={c.done ? 'line-through text-[var(--text-muted)]' : ''}>{c.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Milestones */}
      {job.milestones?.length > 0 && (
        <Card title="Milestones">
          <div className="space-y-3">
            {job.milestones.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  {m.description && <p className="text-xs text-[var(--text-secondary)]">{m.description}</p>}
                  {m.dueDate && <p className="text-xs text-[var(--text-muted)] mt-0.5">Due {new Date(m.dueDate).toLocaleDateString()}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${Number(m.amount).toFixed(2)}</p>
                  <Badge variant={m.status === 'completed' ? 'success' : m.status === 'active' ? 'info' : 'default'}>{m.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attachments */}
      {job.attachments?.length > 0 && (
        <Card title="Attachments">
          <div className="space-y-2">
            {job.attachments.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{a.originalName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{(a.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <a
                  href={`/api/v1/jobs/${job.id}/attachments/${a.id}/download`}
                  className="text-xs text-[var(--accent)] hover:underline shrink-0 ml-2"
                  download
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Change History */}
      {job.changes?.length > 0 && (
        <Card title="Change History">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {job.changes.map((c: any) => (
              <div key={c.id} className="text-xs border-l-2 border-[var(--border)] pl-3">
                <p className="text-[var(--text-muted)]">{FIELD_LABELS[c.field] || c.field} changed by <span className="font-medium text-[var(--text-secondary)]">{c.changedBy}</span> {timeAgo(new Date(c.createdAt))}</p>
                <p className="mt-0.5 text-[var(--text-secondary)]">
                  <span className="text-red-500 line-through mr-1">{formatValue(c.oldValue)}</span>
                  <span className="text-green-500">{formatValue(c.newValue)}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confirm Modal */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'permanent' ? 'Delete permanently' : confirmAction?.type === 'archive' ? 'Archive' : 'Cancel job'}>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{confirmMessage}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)} disabled={busy}>Keep</Button>
          <Button size="sm" variant={confirmAction?.type === 'permanent' ? 'danger' : 'primary'} onClick={handleAction} loading={busy}>
            {confirmAction?.type === 'permanent' ? 'Delete' : confirmAction?.type === 'archive' ? 'Archive' : 'Cancel'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
