'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Service {
  id: string; title: string; description?: string | null;
  rateMin: number; rateMax?: number | null; currency: string;
}

export function ServicesManager({
  items, onAdd, onUpdate, onDelete, loading,
}: {
  items: Service[];
  onAdd: (data: any) => Promise<any>;
  onUpdate: (id: string, data: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  loading?: boolean;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', rateMin: '', rateMax: '', currency: 'USD' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm({ title: '', description: '', rateMin: '', rateMax: '', currency: 'USD' });
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.rateMin) return;
    setSaving(true);
    try {
      const data: any = {
        title: form.title,
        rateMin: parseFloat(form.rateMin),
        currency: form.currency,
      };
      if (form.description) data.description = form.description;
      if (form.rateMax) data.rateMax = parseFloat(form.rateMax);

      if (editing) {
        await onUpdate(editing, data);
        toast('Service updated', 'success');
      } else {
        await onAdd(data);
        toast('Service added', 'success');
      }
      resetForm();
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    try { await onDelete(id); toast('Service deleted', 'info'); }
    catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  };

  const startEdit = (item: Service) => {
    setEditing(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      rateMin: String(item.rateMin),
      rateMax: item.rateMax ? String(item.rateMax) : '',
      currency: item.currency,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && !showForm && (
        <p className="text-xs text-[var(--text-muted)]">No services listed yet.</p>
      )}
      {items.map((s) => (
        <div key={s.id} className="border border-[var(--border)] radius-brutal p-3 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{s.title}</div>
              {s.description && <div className="text-xs text-[var(--text-secondary)] mt-1">{s.description}</div>}
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {s.currency} {s.rateMin}{s.rateMax ? ` - ${s.currency} ${s.rateMax}` : ''}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => startEdit(s)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Edit</button>
              <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500">Delete</button>
            </div>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="border border-[var(--border)] radius-brutal p-3 space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Description</label>
            <textarea className="input-bw w-full px-3 py-2 text-sm radius-brutal resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <Input label="Minimum Rate" type="number" value={form.rateMin} onChange={(e) => setForm((f) => ({ ...f, rateMin: e.target.value }))} required min={0} step="0.01" />
          <Input label="Maximum Rate (optional)" type="number" value={form.rateMax} onChange={(e) => setForm((f) => ({ ...f, rateMax: e.target.value }))} min={0} step="0.01" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Add'}</Button>
            <Button variant="secondary" size="sm" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => { resetForm(); setShowForm(true); }} disabled={loading}>
          Add Service
        </Button>
      )}
    </div>
  );
}
