'use client';

import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthProvider';

export function AvatarUpload() {
  const { user, refreshUser } = useAuth();
  const { uploadAvatar, loading } = useProfile();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      await uploadAvatar(file);
      toast('Avatar updated', 'success');
      refreshUser();
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
      setPreview(null);
    }
  };

  const src = preview || (user?.avatarUrl ? user.avatarUrl : null);

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full border-2 border-[var(--border)] overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl font-bold text-[var(--text-muted)]">
        {src ? (
          <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          (user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()
        )}
      </div>
      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {loading ? 'Uploading...' : 'Change avatar'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
