import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`glass radius-brutal p-6 ${className}`}>
      {title && <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{title}</h3>}
      {children}
    </div>
  );
}
