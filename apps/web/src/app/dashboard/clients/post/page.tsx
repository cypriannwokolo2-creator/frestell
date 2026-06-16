'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

const DRAFT_KEY = 'frestell_job_draft';

interface Criterion {
  id: string;
  description: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: string;
  dueDate: string;
}

interface FormState {
  title: string;
  description: string;
  budgetType: 'fixed' | 'milestone' | 'hourly';
  budgetAmount: string;
  budgetHoursMin: string;
  budgetHoursMax: string;
  deadline: string;
  tags: string[];
  categoryId: string;
  visibility: 'public' | 'invite_only' | 'hidden';
  applicationLimit: string;
}

let uid = 0;
function freshId() { return `id_${++uid}`; }

function freshCriterion(desc = ''): Criterion {
  return { id: freshId(), description: desc };
}

function freshMilestone(): Milestone {
  return { id: freshId(), title: '', description: '', amount: '', dueDate: '' };
}

function getDefaultForm(): FormState {
  return {
    title: '', description: '', budgetType: 'fixed', budgetAmount: '',
    budgetHoursMin: '', budgetHoursMax: '', deadline: '', tags: [],
    categoryId: '', visibility: 'public', applicationLimit: '50',
  };
}

function getFieldError(err: any): string {
  if (err.data?.details?.fieldErrors) {
    for (const [, errors] of Object.entries(err.data.details.fieldErrors)) {
      if (Array.isArray(errors) && errors.length) return errors[0];
    }
  }
  if (err.data?.details?.formErrors?.length) return err.data.details.formErrors[0];
  return err.message || 'Request failed';
}

function validateForm(form: FormState, criteria: Criterion[], milestones: Milestone[], publishing: boolean): string | null {
  const t = form.title.trim();
  if (!t) return 'Title is required';
  if (t.length < 3) return 'Title must be at least 3 characters';
  const d = form.description.trim();
  if (!d) return 'Description is required';
  if (d.replace(/<[^>]+>/g, '').trim().length < 10) return 'Description must be at least 10 characters (excluding HTML)';

  if (publishing) {
    const filled = criteria.filter((c) => c.description.trim().length >= 10);
    if (filled.length < 3) return 'Add at least 3 acceptance criteria (min 10 chars each) before publishing';

    if (form.budgetType === 'milestone') {
      const validM = milestones.filter((m) => m.title.trim());
      if (validM.length < 1) return 'At least 1 milestone is required';
      if (form.budgetAmount && validM.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0) !== parseFloat(form.budgetAmount)) {
        return 'Milestone total must equal the budget amount';
      }
    }

    if (form.budgetType === 'fixed' && !form.budgetAmount) return 'Budget amount is required for fixed-price jobs';

    if (form.budgetType === 'hourly') {
      const min = parseFloat(form.budgetHoursMin);
      const max = parseFloat(form.budgetHoursMax);
      if (!min || !max || min >= max) return 'Hourly jobs require min < max hours';
    }
  }
  return null;
}

export default function PostJobPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(getDefaultForm);
  const [criteria, setCriteria] = useState<Criterion[]>([freshCriterion(), freshCriterion(), freshCriterion()]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; originalName: string; size: number; mimeType: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState<{ id: string; name: string; category: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; level: number }[]>([]);
  const skillRef = useRef<HTMLDivElement>(null);
  const skillTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    apiClient.get('/jobs/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.form?.title || saved.form?.description || saved.criteria?.length) setRestoring(true);
    } catch { /* ignore */ }
  }, []);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.form) setForm(saved.form);
      if (saved.criteria?.length) setCriteria(saved.criteria.map((c: string) => freshCriterion(c)));
      if (saved.milestones?.length) setMilestones(saved.milestones.map((m: any) => ({ ...m, id: freshId() })));
      toast('Draft restored', 'success');
    } catch { toast('Failed to restore draft', 'error'); }
    setRestoring(false);
  }, [toast]);

  const discardDraft = useCallback(() => { localStorage.removeItem(DRAFT_KEY); setRestoring(false); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        form, criteria: criteria.map((c) => c.description), milestones, savedAt: new Date().toISOString(),
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, [form, criteria, milestones]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        form, criteria: criteria.map((c) => c.description), milestones, savedAt: new Date().toISOString(),
      }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, criteria, milestones]);

  useEffect(() => {
    if (skillQuery.trim().length < 1) { setSkillSuggestions([]); setShowSuggestions(false); return; }
    if (skillTimeout.current) clearTimeout(skillTimeout.current);
    skillTimeout.current = setTimeout(async () => {
      try {
        const data = await apiClient.get(`/profile/skills?q=${encodeURIComponent(skillQuery.trim())}`);
        setSkillSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 200);
    return () => { if (skillTimeout.current) clearTimeout(skillTimeout.current); };
  }, [skillQuery]);

  useEffect(() => {
    const f = (e: MouseEvent) => { if (skillRef.current && !skillRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  const update = useCallback((field: string, value: string) => setForm((f) => ({ ...f, [field]: value })), []);

  const addCriterion = useCallback(() => setCriteria((prev) => [...prev, freshCriterion()]), []);
  const removeCriterion = useCallback((id: string) => setCriteria((prev) => prev.filter((c) => c.id !== id)), []);
  const updateCriterion = useCallback((id: string, description: string) => setCriteria((prev) => prev.map((c) => c.id === id ? { ...c, description } : c)), []);

  const addMilestone = useCallback(() => setMilestones((prev) => [...prev, freshMilestone()]), []);
  const removeMilestone = useCallback((id: string) => setMilestones((prev) => prev.filter((m) => m.id !== id)), []);
  const updateMilestone = useCallback((id: string, field: string, value: string) => setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m)), []);

  const addTag = useCallback((skill: string) => { if (!form.tags.includes(skill)) setForm((f) => ({ ...f, tags: [...f.tags, skill] })); setSkillQuery(''); setShowSuggestions(false); }, [form.tags]);
  const removeTag = useCallback((skill: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== skill) })), []);

  function buildPayload() {
    const payload: Record<string, unknown> = {
      title: form.title, description: form.description, budgetType: form.budgetType,
      tags: form.tags, visibility: form.visibility, applicationLimit: parseInt(form.applicationLimit) || 50,
      acceptanceCriteria: criteria.filter((c) => c.description.trim().length >= 10).map((c, i) => ({ description: c.description.trim(), position: i })),
    };

    if (form.categoryId) payload.categoryId = form.categoryId;

    if (form.budgetType === 'milestone') {
      payload.budgetAmount = form.budgetAmount ? parseFloat(form.budgetAmount) : undefined;
      const validM = milestones.filter((m) => m.title.trim());
      if (validM.length) {
        payload.milestones = validM.map((m, i) => ({
          title: m.title.trim(), description: m.description.trim(), amount: parseFloat(m.amount) || 0,
          dueDate: m.dueDate || undefined, position: i,
        }));
      }
    } else if (form.budgetType === 'fixed') {
      payload.budgetAmount = form.budgetAmount ? parseFloat(form.budgetAmount) : undefined;
    } else {
      payload.budgetHoursMin = form.budgetHoursMin ? parseFloat(form.budgetHoursMin) : undefined;
      payload.budgetHoursMax = form.budgetHoursMax ? parseFloat(form.budgetHoursMax) : undefined;
      payload.budgetAmount = 0;
    }

    if (form.deadline) payload.deadline = form.deadline;
    return payload;
  }

  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

  async function saveDraft() {
    const error = validateForm(form, criteria, milestones, false);
    if (error) { toast(error, 'error'); return; }
    setSaving(true);
    try {
      const job = await apiClient.post(ENDPOINTS.jobs, buildPayload());
      clearDraft(); setCreatedJobId(job.id); toast('Draft saved', 'success');
    } catch (err: any) { toast(getFieldError(err), 'error'); }
    finally { setSaving(false); }
  }

  async function publishJob() {
    const error = validateForm(form, criteria, milestones, true);
    if (error) { toast(error, 'error'); return; }
    setPublishing(true);
    try {
      const job = await apiClient.post(ENDPOINTS.jobs, buildPayload());
      setCreatedJobId(job.id);
      await apiClient.post(`${ENDPOINTS.jobs}/${job.id}/publish`);
      clearDraft(); toast('Job published', 'success');
    } catch (err: any) { toast(getFieldError(err), 'error'); }
    finally { setPublishing(false); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !createdJobId) return;
    if (file.size > 20 * 1024 * 1024) { toast('File exceeds 20MB limit', 'error'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'];
    if (!allowed.includes(file.type)) { toast('File type not allowed', 'error'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const attachment = await apiClient.post(`/jobs/${createdJobId}/attachments`, formData, { formData: true });
      setAttachments((prev) => [...prev, attachment]);
      toast('File uploaded', 'success');
    } catch (err: any) { toast(err.message || 'Upload failed', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {restoring && (
        <Card>
          <div className="flex items-center gap-4">
            <p className="text-sm">You have an unsaved draft.</p>
            <Button size="sm" onClick={restoreDraft}>Restore</Button>
            <Button size="sm" variant="secondary" onClick={discardDraft}>Discard</Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Create a New Job</h2>
        <div className="space-y-4">
          <Input label="Job Title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Build a React dashboard" required />

          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Description</label>
            <RichTextEditor value={form.description} onChange={(html) => update('description', html)} placeholder="Describe the project, requirements, and deliverables..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Budget Type</label>
              <Dropdown
                options={[
                  { value: 'fixed', label: 'Fixed Price' },
                  { value: 'milestone', label: 'Milestone-based' },
                  { value: 'hourly', label: 'Hourly Rate' },
                ]}
                value={form.budgetType} onChange={(v: string) => update('budgetType', v)}
              />
            </div>
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
          </div>

          {form.budgetType === 'fixed' && (
            <Input label="Budget (USD)" type="number" value={form.budgetAmount} onChange={(e) => update('budgetAmount', e.target.value)} min={0} step="0.01" placeholder="0.00" />
          )}

          {form.budgetType === 'milestone' && (
            <>
              <Input label="Total Budget (USD)" type="number" value={form.budgetAmount} onChange={(e) => update('budgetAmount', e.target.value)} min={0} step="0.01" placeholder="Total of all milestones" />
              <details className="glass radius-brutal p-4" open>
                <summary className="text-sm font-semibold cursor-pointer select-none">
                  Milestones ({milestones.filter((m) => m.title.trim()).length})
                </summary>
                <div className="mt-3 space-y-3">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="border border-[var(--border)] radius-brutal p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Milestone {i + 1}</span>
                        <button type="button" onClick={() => removeMilestone(m.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                      <Input label="Title" value={m.title} onChange={(e) => updateMilestone(m.id, 'title', e.target.value)} placeholder="e.g. Design approval" />
                      <Input label="Amount (USD)" type="number" value={m.amount} onChange={(e) => updateMilestone(m.id, 'amount', e.target.value)} min={0} step="0.01" placeholder="0.00" />
                      <Input label="Due Date" type="date" value={m.dueDate} onChange={(e) => updateMilestone(m.id, 'dueDate', e.target.value)} />
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addMilestone}>+ Add Milestone</Button>
                </div>
              </details>
            </>
          )}

          {form.budgetType === 'hourly' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min Hours" type="number" value={form.budgetHoursMin} onChange={(e) => update('budgetHoursMin', e.target.value)} min={0} step="0.5" placeholder="e.g. 10" />
              <Input label="Max Hours" type="number" value={form.budgetHoursMax} onChange={(e) => update('budgetHoursMax', e.target.value)} min={0} step="0.5" placeholder="e.g. 40" />
            </div>
          )}

          <div ref={skillRef}>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Skills</label>
            <div className="relative">
              <input className="input-bw w-full px-3 py-2 text-sm radius-brutal" value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} onFocus={() => skillSuggestions.length > 0 && setShowSuggestions(true)} placeholder="Search skills..." />
              {showSuggestions && skillSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full border border-[var(--border)] radius-brutal overflow-hidden shadow-lg max-h-48 overflow-y-auto" style={{ background: 'var(--card-bg)' }}>
                  {skillSuggestions.map((s) => (
                    <button key={s.id} type="button" onClick={() => addTag(s.name)} className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)] cursor-pointer border-b border-[var(--glass-border)] last:border-b-0">{s.name} <span className="text-xs text-[var(--text-muted)] ml-2">({s.category})</span></button>
                  ))}
                </div>
              )}
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs radius-brutal border border-[var(--border)]">{tag}<button type="button" onClick={() => removeTag(tag)} className="text-[var(--text-muted)] hover:text-red-400">&times;</button></span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Category</label>
              <Dropdown
                options={[
                  { value: '', label: 'None' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={form.categoryId} onChange={(v: string) => update('categoryId', v)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Visibility</label>
              <Dropdown
                options={[
                  { value: 'public', label: 'Public (searchable)' },
                  { value: 'invite_only', label: 'Invite Only' },
                  { value: 'hidden', label: 'Hidden' },
                ]}
                value={form.visibility} onChange={(v: string) => update('visibility', v)}
              />
            </div>
          </div>

          <Input label="Application Limit" type="number" value={form.applicationLimit} onChange={(e) => update('applicationLimit', e.target.value)} min={1} max={200} placeholder="50" />

          <details className="glass radius-brutal p-4">
            <summary className="text-sm font-semibold cursor-pointer select-none">
              Acceptance Criteria ({criteria.filter((c) => c.description.trim().length >= 10).length} / 3 minimum)
            </summary>
            <div className="mt-3 space-y-2">
              {criteria.map((c, i) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <span className="text-xs text-[var(--text-muted)] mt-2 w-5 shrink-0">{i + 1}.</span>
                  <textarea className="input-bw flex-1 px-3 py-2 text-sm radius-brutal resize-none" rows={2} value={c.description} onChange={(e) => updateCriterion(c.id, e.target.value)} placeholder="Describe a measurable acceptance criterion..." />
                  {criteria.length > 1 && <button type="button" onClick={() => removeCriterion(c.id)} className="text-xs text-red-400 hover:text-red-300 mt-2 shrink-0">Remove</button>}
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addCriterion}>+ Add Criterion</Button>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <Button onClick={saveDraft} loading={saving} variant="secondary">Save Draft</Button>
            <Button onClick={() => setShowPreview(true)} variant="secondary">Preview</Button>
            <Button onClick={publishJob} loading={publishing}>Publish Job</Button>
          </div>

          <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Job Preview">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">{form.title || '(untitled)'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success">active</Badge>
                  {form.visibility !== 'public' && <Badge variant="default">{form.visibility.replace('_', ' ')}</Badge>}
                  {form.categoryId && categories.find((c) => c.id === form.categoryId) && (
                    <span className="text-xs text-[var(--text-muted)]">{categories.find((c) => c.id === form.categoryId)?.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  {form.budgetType === 'hourly' ? (
                    <span>${parseFloat(form.budgetHoursMin || '0').toFixed(2)}/hr - ${parseFloat(form.budgetHoursMax || '0').toFixed(2)}/hr</span>
                  ) : form.budgetType === 'milestone' ? (
                    <span>${parseFloat(form.budgetAmount || '0').toFixed(2)} milestone-based</span>
                  ) : (
                    <span>${parseFloat(form.budgetAmount || '0').toFixed(2)} {form.budgetType}</span>
                  )}
                  {form.deadline && <span>Due {new Date(form.deadline).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="prose prose-sm max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-a:text-[var(--accent)] prose-strong:text-[var(--text-primary)]">
                <div dangerouslySetInnerHTML={{ __html: form.description || '<p class="text-[var(--text-muted)] italic">No description</p>' }} />
              </div>

              {criteria.some((c) => c.description.trim()) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    {criteria.filter((c) => c.description.trim()).map((c, i) => (
                      <li key={c.id} className="flex items-start gap-2"><span className="text-[var(--text-muted)]">•</span>{c.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {milestones.some((m) => m.title.trim()) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2">Milestones</p>
                  <div className="space-y-2">
                    {milestones.filter((m) => m.title.trim()).map((m) => (
                      <div key={m.id} className="flex justify-between p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-sm">
                        <div>
                          <p className="font-medium">{m.title}</p>
                          {m.dueDate && <p className="text-xs text-[var(--text-muted)]">Due {new Date(m.dueDate).toLocaleDateString()}</p>}
                        </div>
                        <span className="font-semibold">${parseFloat(m.amount || '0').toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)]">{tag}</span>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-4 text-center">
                <Button disabled size="sm">Apply Now</Button>
                <p className="text-xs text-[var(--text-muted)] mt-2">This is how freelancers will see your job</p>
              </div>
            </div>
          </Modal>

          {createdJobId && (
            <div className="border-t border-[var(--border)] pt-4 mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2">Attachments</h3>
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" onChange={handleFileUpload} className="text-xs text-[var(--text-muted)] file:mr-3 file:py-1 file:px-3 file:text-xs file:radius-brutal file:border file:border-[var(--border)] file:bg-[var(--card-bg)] file:text-[var(--text-primary)] file:cursor-pointer" />
                {uploading && <span className="text-xs text-[var(--text-muted)]">Uploading...</span>}
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>{a.originalName}</span>
                      <span>({(a.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
