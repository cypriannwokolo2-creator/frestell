'use client';

import { useState, useEffect } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Skill { id: string; name: string; category: string; }

export function SkillsSelector({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    apiClient.get<Skill[]>(ENDPOINTS.skillsTaxonomy).then(setAllSkills).catch(() => {});
    apiClient.get<any[]>(ENDPOINTS.mySkills).then((skills) => {
      setSelected(skills.map((s: any) => ({ id: s.skillId || s.skill.id, name: s.skill.name, category: s.skill.category })));
    }).catch(() => {});
  }, []);

  const filtered = allSkills.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) && !selected.find((sel) => sel.id === s.id)
  );
  const paged = filtered.slice(0, page * perPage);
  const hasMore = paged.length < filtered.length;

  const handleAdd = async (skill: Skill) => {
    setLoading(true);
    try {
      await apiClient.post(ENDPOINTS.mySkills, { skillId: skill.id });
      setSelected((prev) => [...prev, skill]);
      toast(`Added ${skill.name}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to add skill', 'error');
    } finally { setLoading(false); }
  };

  const handleRemove = async (skill: Skill) => {
    setLoading(true);
    try {
      await apiClient.delete(`${ENDPOINTS.mySkills}/${skill.id}`);
      setSelected((prev) => prev.filter((s) => s.id !== skill.id));
    } catch (err: any) {
      toast(err.message || 'Failed to remove skill', 'error');
    } finally { setLoading(false); }
  };

  const grouped = selected.reduce<Record<string, Skill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, skills]) => (
            <div key={cat}>
              <div className="text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">{cat}</div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[var(--border)] radius-brutal cursor-pointer hover:border-red-500/40 hover:text-red-500 transition-colors"
                    onClick={() => handleRemove(s)}
                  >
                    {s.name} &times;
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Input
        placeholder="Search skills..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {paged.map((s) => (
          <button
            key={s.id}
            onClick={() => handleAdd(s)}
            disabled={loading}
            className="px-2 py-1 text-xs border border-[var(--border)] radius-brutal hover:bg-[var(--hover-overlay)] hover:border-[var(--text-muted)] transition-colors disabled:opacity-40"
          >
            {s.name}
          </button>
        ))}
      </div>
      {hasMore && (
        <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>
          Show more
        </Button>
      )}
    </div>
  );
}
