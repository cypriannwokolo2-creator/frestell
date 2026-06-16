'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Collapse } from '@/components/ui/Collapse';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { SkillsSelector } from '@/components/profile/SkillsSelector';
import { PortfolioManager } from '@/components/profile/PortfolioManager';
import { ServicesManager } from '@/components/profile/ServicesManager';
import { SocialLinksManager } from '@/components/profile/SocialLinksManager';
import { CompletenessIndicator } from '@/components/profile/CompletenessIndicator';
import { Dropdown } from '@/components/ui/Dropdown';
import { UsernameEditor } from '@/components/profile/UsernameEditor';

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const profile = useProfile();

  const [profileData, setProfileData] = useState<any>(null);
  const [form, setForm] = useState({ displayName: '', bio: '', title: '', location: '', timezone: '', hourlyRate: '', companyName: '', companyIndustry: '', companySize: '', website: '' });
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    profile.getMyProfile().then((data: any) => {
      setProfileData(data);
      setForm({
        displayName: data.displayName || '',
        bio: data.bio || '',
        title: data.title || '',
        location: data.location || '',
        timezone: data.timezone || '',
        hourlyRate: data.hourlyRate ? String(data.hourlyRate) : '',
        companyName: data.companyName || '',
        companyIndustry: data.companyIndustry || '',
        companySize: data.companySize || '',
        website: data.website || '',
      });
    }).catch(() => toast('Failed to load profile', 'error'));
    profile.listPortfolio().then(setPortfolio).catch(() => {});
    profile.listServices().then(setServices).catch(() => {});
    profile.listSocialLinks().then(setLinks).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.timezone) {
      setForm((f) => ({ ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    }
  }, []);

  const handleSaveBasic = async () => {
    setSaving(true);
    try {
      const data: any = { displayName: form.displayName, bio: form.bio };
      if (form.title) data.title = form.title;
      if (form.location) data.location = form.location;
      if (form.timezone) data.timezone = form.timezone;
      if (form.hourlyRate) data.hourlyRate = parseFloat(form.hourlyRate);
      if (form.companyName) data.companyName = form.companyName;
      if (form.companyIndustry) data.companyIndustry = form.companyIndustry;
      if (form.companySize) data.companySize = form.companySize;
      if (form.website) data.website = form.website;

      await profile.updateProfile(data);
      refreshUser();
      toast('Profile saved', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  return (
    <AuthGuard>
      <DashboardShell>
        <div className="max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Profile</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage your public profile and portfolio.</p>
          </div>

          {/* ─── Completeness ─────────────────────────────── */}
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Profile Strength</h2>
            <CompletenessIndicator />
          </Card>

          {/* ─── Username ─────────────────────────────────── */}
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Username</h2>
            <UsernameEditor />
          </Card>

          {/* ─── Basic Info ───────────────────────────────── */}
          <Card>
            <Collapse title="Basic Information" defaultOpen>
              <div className="space-y-4">
                <AvatarUpload />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Display Name" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
                  <Input label="Professional Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Full Stack Developer" />
                  <Input label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, Country" />
                  <Input label="Timezone" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
                  <Input label="Hourly Rate (USD)" type="number" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} min={0} step="0.01" />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Bio</label>
                  <textarea
                    className="input-bw w-full px-3 py-2 text-sm radius-brutal resize-none"
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell potential clients about yourself..."
                    maxLength={500}
                  />
                  <div className="text-xs text-[var(--text-muted)] text-right mt-1">{form.bio.length}/500</div>
                </div>

                {user?.role === 'client' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Company Name" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
                    <Input label="Industry" value={form.companyIndustry} onChange={(e) => setForm((f) => ({ ...f, companyIndustry: e.target.value }))} />
                    <Input label="Company Size" value={form.companySize} onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))} placeholder="e.g. 1-10, 11-50" />
                    <Input label="Website" type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
                  </div>
                )}

                <Button onClick={handleSaveBasic} loading={saving}>Save Changes</Button>
              </div>
            </Collapse>
          </Card>

          {/* ─── Skills ───────────────────────────────────── */}
          <Card>
            <Collapse title="Skills">
              <SkillsSelector userId={user?.id || ''} />
            </Collapse>
          </Card>

          {/* ─── Portfolio (Freelancer) ────────────────────── */}
          {user?.role === 'freelancer' && (
            <Card>
              <Collapse title="Portfolio">
                <PortfolioManager
                  items={portfolio}
                  onAdd={profile.addPortfolioItem}
                  onUpdate={profile.updatePortfolioItem}
                  onDelete={profile.deletePortfolioItem}
                  loading={profile.loading}
                />
              </Collapse>
            </Card>
          )}

          {/* ─── Services (Freelancer) ─────────────────────── */}
          {user?.role === 'freelancer' && (
            <Card>
              <Collapse title="Services">
                <ServicesManager
                  items={services}
                  onAdd={profile.addService}
                  onUpdate={profile.updateService}
                  onDelete={profile.deleteService}
                  loading={profile.loading}
                />
              </Collapse>
            </Card>
          )}

          {/* ─── Social Links ─────────────────────────────── */}
          <Card>
            <Collapse title="Social Links">
              <SocialLinksManager
                links={links}
                onAdd={profile.addSocialLink}
                onDelete={profile.deleteSocialLink}
                loading={profile.loading}
              />
            </Collapse>
          </Card>

          {/* ─── Availability & Visibility ────────────────── */}
          <Card>
            <Collapse title="Availability & Visibility">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Availability</div>
                    <div className="text-xs text-[var(--text-muted)]">{profileData?.availabilityStatus || 'available'}</div>
                  </div>
                  <Dropdown
                    options={[
                      { value: 'available', label: 'Available' },
                      { value: 'unavailable', label: 'Unavailable' },
                      { value: 'hired', label: 'Hired' },
                    ]}
                    value={profileData?.availabilityStatus || 'available'}
                    onChange={async (val) => {
                      await profile.updateAvailability(val);
                      setProfileData((p: any) => ({ ...p, availabilityStatus: val }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Profile Visibility</div>
                    <div className="text-xs text-[var(--text-muted)]">{profileData?.profileVisibility || 'public'}</div>
                  </div>
                  <Dropdown
                    options={[
                      { value: 'public', label: 'Public' },
                      { value: 'private', label: 'Private (hire-only)' },
                      { value: 'hidden', label: 'Hidden' },
                    ]}
                    value={profileData?.profileVisibility || 'public'}
                    onChange={async (val) => {
                      await profile.updateVisibility(val);
                      setProfileData((p: any) => ({ ...p, profileVisibility: val }));
                    }}
                  />
                </div>
              </div>
            </Collapse>
          </Card>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
