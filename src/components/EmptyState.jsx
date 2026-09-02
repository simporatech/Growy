import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionIcon,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) {
  return (
    <div className={`w-full p-8 sm:p-10 rounded-2xl sm:rounded-3xl glass-card border border-white/[0.08] text-center flex flex-col items-center justify-center space-y-3.5 my-2 animate-fade-in ${className}`}>
      {Icon && (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-400 mb-1 shadow-inner transition-transform hover:scale-105">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 stroke-[1.75]" />
        </div>
      )}

      {title && (
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-normal leading-relaxed">
          {description}
        </p>
      )}

      {(actionText && onAction) && (
        <div className="pt-2 flex items-center gap-3">
          <Button
            size="md"
            variant="primary"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionText}
          </Button>

          {secondaryActionText && onSecondaryAction && (
            <Button
              size="md"
              variant="secondary"
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
