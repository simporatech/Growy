import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-white/5',
  iconBorderColor = 'border-white/10',
  iconTextColor,
  error,
  children,
  maxWidth = 'max-w-lg'
}) {
  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E2D32]/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      {/* Modal Dialog Box with overflow-visible to prevent clipping floating popovers */}
      <div className={`bg-[#1E2D32] rounded-3xl p-6 sm:p-7 w-full ${maxWidth} mx-auto border border-white/10 shadow-2xl shadow-black/60 relative overflow-visible my-auto`}>
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center absolute top-5 right-5 cursor-pointer z-10"
          title="Cerrar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        {(title || Icon) && (
          <div className="flex items-center gap-3.5 mb-6 pr-8">
            {Icon && (
              <div className={`w-12 h-12 rounded-2xl ${iconBgColor} border ${iconBorderColor} flex items-center justify-center text-xl shrink-0 ${iconTextColor || ''}`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-slate-300 font-normal mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-shake">
            {error}
          </div>
        )}

        {/* Body Content */}
        {children}

      </div>
    </div>
  );
}
