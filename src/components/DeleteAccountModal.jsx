import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function DeleteAccountModal({ isOpen, onClose, onConfirmDelete, isDeleting }) {
  const { language } = useSettings();
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const requiredWord = language === 'es' ? 'ELIMINAR' : 'DELETE';
  const isUnlocked = confirmInput.trim().toUpperCase() === requiredWord;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isUnlocked) {
      setError(language === 'es' ? `Escribe "${requiredWord}" para confirmar.` : `Type "${requiredWord}" to confirm.`);
      return;
    }
    onConfirmDelete();
  };

  const handleClose = () => {
    setConfirmInput('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#162226] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 border-b border-rose-500/20 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 font-bold">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {language === 'es' ? '¿Eliminar Cuenta Definitivamente?' : 'Delete Account Permanently?'}
            </h3>
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">
              {language === 'es' ? 'Zona de Peligro Extremo' : 'Extreme Danger Zone'}
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-rose-500/5 p-3.5 rounded-2xl border border-rose-500/15">
          {language === 'es'
            ? 'Esta acción es irreversible. Se eliminarán permanentemente todas tus transacciones, cuentas, categorías y configuraciones de la base de datos de Supabase.'
            : 'This action is irreversible. All your transactions, accounts, categories, and settings will be permanently deleted from the Supabase database.'
          }
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'es' 
                ? `Escribe "${requiredWord}" para confirmar la eliminación:`
                : `Type "${requiredWord}" to confirm deletion:`
              }
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                if (error) setError('');
              }}
              placeholder={language === 'es' ? 'Escribe ELIMINAR para confirmar' : 'Type DELETE to confirm'}
              className="w-full h-11 px-4 bg-[#1E2D32] border border-rose-500/30 rounded-xl text-xs font-bold text-rose-300 text-center tracking-wider uppercase outline-none focus:border-rose-400 placeholder:opacity-25 placeholder:grayscale caret-rose-400"
              autoFocus
            />
            {error && <span className="text-[11px] text-rose-400 font-semibold block text-center">{error}</span>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!isUnlocked || isDeleting}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? (language === 'es' ? 'Eliminando...' : 'Deleting...') : (language === 'es' ? 'Eliminar Mi Cuenta' : 'Delete My Account')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
