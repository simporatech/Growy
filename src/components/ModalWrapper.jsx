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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog Box */}
      <div className={`bg-[#111C20] rounded-t-3xl sm:rounded-2xl w-full ${maxWidth} max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden mx-auto border-t sm:border border-white/10 shadow-2xl shadow-black/80 relative my-0 sm:my-auto animate-slideUp sm:animate-fadeIn`}>
        
        {/* Header - Fixed */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex-shrink-0 relative bg-[#111C20] z-20">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2 mb-4 sm:hidden" />
          
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center absolute top-3 sm:top-5 right-4 sm:right-5 cursor-pointer z-10"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {(title || Icon) && (
            <div className="flex items-center gap-3 sm:gap-3.5 pr-8">
              {Icon && (
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${iconBgColor} border ${iconBorderColor} flex items-center justify-center text-lg sm:text-xl shrink-0 ${iconTextColor || ''}`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
              <div>
                {title && <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h3>}
                {subtitle && <p className="text-xs sm:text-sm text-slate-400 font-normal mt-0.5">{subtitle}</p>}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-shake">
              {error}
            </div>
          )}
        </div>

        {/* Body Content - Flex container for forms */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {children}
        </div>

      </div>
    </div>
  );
}
