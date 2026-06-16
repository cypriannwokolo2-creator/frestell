'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface PortfolioItem {
  id: string; title: string; description?: string | null;
  images: string[]; liveUrl?: string | null; githubUrl?: string | null;
  completionDate?: string | null;
}

export function PortfolioManager({
  items, onAdd, onUpdate, onDelete, loading,
}: {
  items: PortfolioItem[];
  onAdd: (data: any) => Promise<any>;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  loading?: boolean;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', liveUrl: '', githubUrl: '', completionDate: '' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({ title: '', description: '', liveUrl: '', githubUrl: '', completionDate: '' });
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data: any = { title: form.title };
      if (form.description) data.description = form.description;
      if (form.liveUrl) data.liveUrl = form.liveUrl;
      if (form.githubUrl) data.githubUrl = form.githubUrl;
      if (form.completionDate) data.completionDate = form.completionDate;

      if (editing) {
        await onUpdate(editing, data);
        toast('Portfolio item updated', 'success');
      } else {
        await onAdd(data);
        toast('Portfolio item added', 'success');
      }
      resetForm();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio item?')) return;
    try {
      await onDelete(id);
      toast('Portfolio item deleted', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to delete', 'error');
    }
  };

  const startEdit = (item: PortfolioItem) => {
    setEditing(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      liveUrl: item.liveUrl || '',
      githubUrl: item.githubUrl || '',
      completionDate: item.completionDate || '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && !showForm && (
        <p className="text-xs text-[var(--text-muted)]">No portfolio items yet.</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="border border-[var(--border)] radius-brutal p-3 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{item.title}</div>
              {item.description && <div className="text-xs text-[var(--text-secondary)] mt-1">{item.description}</div>}
              <div className="flex gap-3 mt-2 text-xs text-[var(--text-muted)]">
                {item.liveUrl && <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)]">Live &rarr;</a>}
                {item.githubUrl && <a href={item.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)]">GitHub &rarr;</a>}
                {item.completionDate && <span>{new Date(item.completionDate).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(item)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Edit</button>
              <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500">Delete</button>
            </div>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="border border-[var(--border)] radius-brutal p-3 space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Description</label>
            <textarea
              className="input-bw w-full px-3 py-2 text-sm radius-brutal resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Input label="Live URL" type="url" value={form.liveUrl} onChange={(e) => setForm((f) => ({ ...f, liveUrl: e.target.value }))} placeholder="https://..." />
          <Input label="GitHub URL" type="url" value={form.githubUrl} onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))} placeholder="https://..." />
          <Input label="Completion Date" type="date" value={form.completionDate} onChange={(e) => setForm((f) => ({ ...f, completionDate: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button>
            <Button variant="secondary" size="sm" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowForm(true); }} disabled={loading}>
          Add Portfolio Item
        </Button>
      )}
    </div>
  );
}
