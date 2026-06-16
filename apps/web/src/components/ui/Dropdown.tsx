'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({ options, value, onChange, disabled, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 text-sm border radius-brutal transition-all duration-200 min-w-[140px] justify-between ${
          disabled
            ? 'opacity-40 pointer-events-none'
            : 'hover:border-[var(--text-muted)] cursor-pointer'
        } border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-primary)]`}
      >
        <span className="truncate">{selected?.label || value}</span>
        <svg
          className={`w-3 h-3 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] border border-[var(--border)] radius-brutal overflow-hidden shadow-lg animate-scale-in"
          style={{
            background: 'var(--card-bg)',
            boxShadow: '0 8px 32px var(--shadow-lg)',
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-all duration-150 border-b border-[var(--glass-border)] last:border-b-0 ${
                  isSelected
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)] hover:text-[var(--text-primary)]'
                } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <svg className="w-3 h-3 shrink-0 text-[var(--text-primary)]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                  {!isSelected && <span className="w-3 shrink-0" />}
                  <span>{option.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
