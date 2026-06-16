'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';

interface SocialLink {
  id: string; type: string; url: string;
}

const LINK_TYPES = [
  { value: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { value: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/username' },
  { value: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
  { value: 'other', label: 'Other', placeholder: 'https://...' },
];

export function SocialLinksManager({
  links, onAdd, onDelete, loading,
}: {
  links: SocialLink[];
  onAdd: (data: { type: string; url: string }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  loading?: boolean;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('github');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onAdd({ type, url });
      toast('Link added', 'success');
      setShowForm(false);
      setUrl('');
    } catch (err: any) {
      toast(err.message || 'Failed to add', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this link?')) return;
    try { await onDelete(id); toast('Link removed', 'info'); }
    catch (err: any) { toast(err.message || 'Failed to remove', 'error'); }
  };

  const activeType = LINK_TYPES.find((t) => t.value === type)?.placeholder || 'https://...';

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div key={link.id} className="flex items-center justify-between py-1.5 text-sm">
          <div>
            <span className="text-xs text-[var(--text-muted)] uppercase mr-2">{link.type}</span>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)]">{link.url}</a>
          </div>
          <button onClick={() => handleDelete(link.id)} className="text-xs text-red-500 hover:text-red-400">&times;</button>
        </div>
      ))}

      {showForm ? (
        <div className="flex gap-2 items-start">
          <Dropdown
            options={LINK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            value={type}
            onChange={(val) => setType(val)}
          />
          <div className="flex-1">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={activeType}
            />
          </div>
          <Button size="sm" onClick={handleSave} loading={saving}>Add</Button>
          <button
            onClick={() => setShowForm(false)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mt-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)} disabled={loading}>
          Add Link
        </Button>
      )}
    </div>
  );
}
