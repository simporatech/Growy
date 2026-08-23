import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { registerModal } from '../utils/modalManager';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register modal in global tracker to notify components (like BottomNav)
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerModal();
    return () => {
      unregister();
    };
  }, [isOpen]);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
      {/* Modal / BottomSheet Dialog Box: 90vh Full-Height on mobile (< 768px), Centered Modal on Desktop */}
      <div className={`w-full fixed sm:static inset-x-0 bottom-0 top-auto h-[90vh] max-h-[92vh] min-h-[80vh] sm:h-auto sm:max-h-[90vh] sm:min-h-0 bg-[#111C20] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl mx-auto border-t sm:border border-white/10 ${maxWidth} relative my-0 sm:my-auto animate-in fade-in slide-in-from-bottom duration-200 shadow-2xl pb-safe sm:pb-0`}>
        
        {/* 1. STICKY HEADER (Fijo arriba) */}
        <div className="sticky top-0 z-20 flex flex-col px-6 py-4 border-b border-white/10 shrink-0 bg-[#111C20]">
          {/* Drag handle bar */}
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-3 sm:hidden" />
          
          <div className="flex items-center justify-between gap-3">
            {(title || Icon) && (
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {Icon && (
                  <div className={`w-10 h-10 rounded-2xl ${iconBgColor} border ${iconBorderColor} flex items-center justify-center text-lg shrink-0 ${iconTextColor || ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {title && <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug truncate">{title}</h3>}
                  {subtitle && <p className="text-xs sm:text-sm text-slate-400 font-normal mt-0.5 truncate">{subtitle}</p>}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shrink-0 ml-2"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium animate-shake">
              {error}
            </div>
          )}
        </div>

        {/* The child forms will provide their own body and footer */}
        {children}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
