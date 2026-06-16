'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  {
    href: '/dashboard/freelancers',
    label: 'Freelancers',
    icon: '◈',
    children: [
      { href: '/dashboard/freelancers/find', label: 'Find Work' },
      { href: '/dashboard/freelancers/applications', label: 'My Applications' },
    ],
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    icon: '◈',
    children: [
      { href: '/dashboard/clients/post', label: 'Post a Job' },
      { href: '/dashboard/clients/jobs', label: 'My Jobs' },
    ],
  },
  { href: '/dashboard/hire-me', label: 'Hire Me', icon: '◈' },
  { href: '/dashboard/settings', label: 'Settings', icon: '☰' },
];

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <aside className="w-56 border-r border-[var(--border)] h-screen flex flex-col bg-[var(--bg-primary)]">
      <div className="h-14 flex items-center px-5 border-b border-[var(--border)]">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded[item.href] || isActive;

          if (hasChildren) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleExpand(item.href)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-base transition-colors rounded-none ${
                      isActive
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-center text-xs">{item.icon}</span>
                    {item.label}
                  </div>
                  <svg
                    className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 2l4 4-4 4" />
                  </svg>
                </button>
                {isExpanded && item.children && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-3 py-1.5 text-sm transition-colors ${
                            childActive
                              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-base transition-colors
                ${isActive
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-overlay)]'
                }`}
            >
              <span className="w-4 text-center text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--border)]">
        <Link
          href="/"
          className="block text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          &larr; Back to site
        </Link>
      </div>
    </aside>
  );
}
