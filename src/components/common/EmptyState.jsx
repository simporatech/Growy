import React from 'react';
import { Plus } from 'lucide-react';

/**
 * Global Design System Standard EmptyState Component
 * 
 * Unifies "no records" / empty states across all modules with consistent
 * dimensions, background blur, slate border, typography and action button.
 */
export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionText,
  actionIcon: ActionIcon,
  onAction,
  className = ''
}) {
  const label = actionLabel || actionText;
  const ButtonIcon = ActionIcon || Plus;

  return (
    <div className={`w-full flex flex-col items-center justify-center p-12 my-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm text-center ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4 text-slate-400 shadow-sm">
          <Icon className="w-7 h-7" />
        </div>
      )}
      {title && (
        <h3 className="text-base md:text-lg font-semibold text-white tracking-tight">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {label && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold rounded-xl bg-[var(--accent)] text-black hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
        >
          {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
          <span>{label}</span>
        </button>
      )}
    </div>
  );
}
