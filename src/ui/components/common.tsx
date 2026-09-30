import type { ReactNode } from 'react';

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Stars({ count, max = 3, animate = false }: { count: number; max?: number; animate?: boolean }) {
  return (
    <span className={`stars ${animate ? 'animate' : ''}`} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? 'star on' : 'star'} style={{ animationDelay: `${i * 180}ms` }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function TopBar({ onBack, title, right }: { onBack?: () => void; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
      ) : (
        <span className="icon-btn placeholder" />
      )}
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">{right}</div>
    </header>
  );
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
