import { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getProfile(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/profile/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getProfile(params.slug);
  if (!profile) return { title: 'Profile Not Found - FreStell' };

  const name = profile.displayName || params.slug;
  const title = profile.title ? `${name} — ${profile.title}` : name;
  const description = profile.bio?.slice(0, 160) || `View ${name}'s profile on FreStell`;

  return {
    title: `${title} - FreStell`,
    description,
    openGraph: {
      title: `${title} - FreStell`,
      description,
      type: 'profile',
      ...(profile.avatarUrl && { images: [{ url: profile.avatarUrl }] }),
    },
  };
}

export default async function FreelancerProfilePage({ params }: { params: { slug: string } }) {
  const profile = await getProfile(params.slug);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-sm text-[var(--text-secondary)]">This profile does not exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const name = profile.displayName || params.slug;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-[var(--border)] overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl font-bold text-[var(--text-muted)] shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              name[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{name}</h1>
            {profile.title && <p className="text-sm text-[var(--text-secondary)]">{profile.title}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {profile.location && <span>{profile.location}</span>}
              {profile.timezone && <span>{profile.timezone}</span>}
              {profile.availabilityStatus === 'available' && (
                <span className="text-green-500 font-medium">Available for work</span>
              )}
              {profile.hourlyRate && (
                <span>${profile.hourlyRate}/hr</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2">About</h2>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s: any) => (
                <span key={s.id} className="px-2.5 py-1 text-xs border border-[var(--border)] radius-brutal">
                  {s.name}
                  {s.endorsements > 0 && <span className="text-[var(--text-muted)] ml-1">({s.endorsements})</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {profile.serviceOfferings?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Services</h2>
            <div className="space-y-3">
              {profile.serviceOfferings.map((svc: any) => (
                <div key={svc.id} className="border border-[var(--border)] radius-brutal p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{svc.title}</div>
                      {svc.description && <div className="text-xs text-[var(--text-secondary)] mt-1">{svc.description}</div>}
                    </div>
                    <div className="text-sm font-semibold shrink-0 ml-4">
                      {svc.currency} {svc.rateMin}{svc.rateMax ? ` - ${svc.currency} ${svc.rateMax}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolioItems?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Portfolio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.portfolioItems.map((item: any) => (
                <div key={item.id} className="border border-[var(--border)] radius-brutal p-4">
                  <div className="font-medium text-sm mb-1">{item.title}</div>
                  {item.description && <div className="text-xs text-[var(--text-secondary)] mb-2">{item.description}</div>}
                  <div className="flex gap-3 text-xs">
                    {item.liveUrl && <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:underline">Live Demo &rarr;</a>}
                    {item.githubUrl && <a href={item.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:underline">Source Code &rarr;</a>}
                  </div>
                  {item.completionDate && <div className="text-xs text-[var(--text-muted)] mt-2">{new Date(item.completionDate).toLocaleDateString()}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {profile.socialLinks?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">Links</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {profile.socialLinks.map((link: any) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-primary)] hover:underline capitalize"
                >
                  {link.type} &rarr;
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
