import React, { DetailedHTMLProps, HTMLAttributes } from "react";
import { cn } from "../utils"; // we'll create a small utility for tailwind merge

export function Tag({ children, className, ...props }: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) {
  return (
    <span className={cn("tag", className)} {...props}>
      {children}
    </span>
  );
}

export function Button({ 
  children, 
  variant = 'ghost', 
  size = 'md', 
  className, ...props 
}: DetailedHTMLProps<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { variant?: 'navy' | 'gold' | 'green' | 'red' | 'ghost', size?: 'sm' | 'md' }) {
  return (
    <button 
      className={cn(
        "btn", 
        variant && `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({ 
  label, val, sub, className, valClass, children, id
}: { label: string; val: React.ReactNode; sub: string; className?: string; valClass?: string; children?: React.ReactNode; id?: string }) {
  return (
    <div className={cn("stat", className)}>
      <div className={cn("stat-lbl", className?.includes('navy') ? 'text-white/50' : 'text-gray-500')}>{label}</div>
      <div id={id} className={cn("stat-val", valClass)}>{val}</div>
      <div className={cn("stat-sub", className?.includes('navy') ? 'text-white/40' : 'text-gray-500')}>{sub}</div>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, sub, icon, iconBg, extra }: { title: string; sub?: string; icon: React.ReactNode; iconBg?: string; extra?: React.ReactNode }) {
  return (
    <div className="card-hd">
      <div className="card-hd-l">
        <div className="ci" style={{ background: iconBg || '#EFF6FF' }}>{icon}</div>
        <div>
          <div className="ct">{title}</div>
          {sub && <div className="cs">{sub}</div>}
        </div>
      </div>
      {extra}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, sub, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; size?: 'sm' | 'md' }) {
  if (!isOpen) return null;
  return (
    <div className="overlay open" onClick={onClose}>
      <div className={cn("modal", size === 'sm' && 'modal-sm')} onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="mclose" onClick={onClose}>×</button>
        </div>
        <div className="mbd">
          {children}
        </div>
      </div>
    </div>
  );
}
