import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import { useSettings } from '../context/SettingsContext';

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  message,
  itemName = 'este elemento',
  itemType = 'elemento',
  confirmText,
  cancelText
}) {
  const { t, language } = useSettings();

  if (!isOpen) return null;

  const displayTitle = title || t('modals.deleteGenericTitle', { item: itemType }, language === 'es' ? `¿Eliminar ${itemType}?` : `Delete ${itemType}?`);
  const displayMessage = message || t('modals.deleteGenericMessage', { name: itemName }, language === 'es' ? `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.` : `Are you sure you want to delete "${itemName}"? This action cannot be undone.`);

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={displayTitle}
      subtitle=""
      icon={AlertTriangle}
      iconBgColor="bg-rose-500/15"
      iconBorderColor="border-rose-500/30"
      iconTextColor="text-rose-400"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5 sm:p-7 space-y-4">
          <p className="text-sm text-slate-300 font-normal leading-relaxed">
            {displayMessage}
          </p>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-5 sm:p-7 border-t border-white/10 bg-[#111C20] flex items-center gap-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-7">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
          >
            {cancelText || t('modals.cancel', {}, language === 'es' ? 'Cancelar' : 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-1/2 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center cursor-pointer"
          >
            {confirmText || t('modals.delete', {}, language === 'es' ? 'Eliminar' : 'Delete')}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
