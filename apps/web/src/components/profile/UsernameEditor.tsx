'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthProvider';

function toSlug(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || '';
}

export function UsernameEditor() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { updateSlug, checkSlug } = useProfile();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(user?.slug || '');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (user?.displayName) setSuggestion(toSlug(user.displayName));
    else if (user?.email) setSuggestion(toSlug(user.email.split('@')[0]));
  }, [user]);

  // Debounced availability check
  useEffect(() => {
    if (!editValue || editValue.length < 3 || editValue === currentSlug) {
      setAvailable(null);
      return;
    }
    const timer = setTimeout(() => {
      setChecking(true);
      checkSlug(editValue).then((res: any) => setAvailable(res.available)).catch(() => setAvailable(null)).finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [editValue, currentSlug, checkSlug]);

  const startEditing = () => {
    setEditValue(currentSlug || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditValue('');
    setAvailable(null);
  };

  const handleSave = async () => {
    if (!editValue || available === false) return;
    setSaving(true);
    try {
      await updateSlug(editValue);
      setCurrentSlug(editValue);
      refreshUser();
      toast('Username updated', 'success');
      cancelEditing();
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  const profileUrl = currentSlug ? `/freelancer/${currentSlug}` : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {editing ? (
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted)]">/</span>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))}
                placeholder={suggestion || 'your-name'}
                className="flex-1 px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--border)] radius-brutal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              {suggestion && suggestion !== editValue && (
                <button
                  type="button"
                  onClick={() => setEditValue(suggestion)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2 py-0.5 radius-brutal"
                >
                  Use suggested: {suggestion}
                </button>
              )}
              {editValue && editValue.length >= 3 && editValue !== currentSlug && (
                <span className="text-xs">
                  {checking ? <span className="text-[var(--text-muted)]">Checking...</span>
                  : available === true ? <span className="text-green-600 dark:text-green-400">Available</span>
                  : available === false ? <span className="text-red-500">Taken</span>
                  : null}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!editValue || editValue.length < 3 || available === false || saving}
                className="px-3 py-1.5 text-sm border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] radius-brutal transition-all duration-200 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--text-secondary)] radius-brutal transition-all duration-200 hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium">{currentSlug || '—'}</span>
              {profileUrl && (
                <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  View profile &rarr;
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={startEditing}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] px-2 py-1 radius-brutal"
            >
              {currentSlug ? 'Change' : 'Set username'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
