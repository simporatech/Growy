import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
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
        <div className="modal-footer shrink-0 z-10 bg-transparent p-4 border-t border-white/[0.06] flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText || t('modals.cancel', {}, language === 'es' ? 'Cancelar' : 'Cancel')}
          </Button>
          <Button
            type="button"
            variant="danger-solid"
            size="md"
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmText || t('modals.delete', {}, language === 'es' ? 'Eliminar' : 'Delete')}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
