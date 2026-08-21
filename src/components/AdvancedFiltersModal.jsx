import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, RotateCcw, Check } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import { useSettings } from '../context/SettingsContext';
import { registerModal } from '../utils/modalManager';

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  typeFilter,
  setTypeFilter,
  datePreset,
  setDatePreset,
  handlePresetChange,
  datePresetOptions,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  accountIdFilter,
  setAccountIdFilter,
  accountOptions,
  categoryIdFilter,
  setCategoryIdFilter,
  categoryOptions,
  activeFilterCount,
  resetFilters
}) {
  const { t } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register in global modal tracker so BottomNav is hidden
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerModal();
    return () => {
      unregister();
    };
  }, [isOpen]);

  // Close on ESC
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
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-transparent cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer / Modal Container */}
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-[#111C20] flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 overflow-hidden shadow-2xl animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 shrink-0 bg-[#111C20] relative">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2 mb-3 sm:hidden" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 flex items-center justify-center text-[var(--color-primary,#AEEDD0)] shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('transactions.advancedFilters', {}, 'Filtros Avanzados')}
                </h3>
                {activeFilterCount > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--color-primary,#AEEDD0)]">
                    {t('transactions.activeCount', { count: activeFilterCount }, `${activeFilterCount} activos`)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 overscroll-contain custom-scrollbar">
          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('transactions.transactionType', {}, 'Tipo de Movimiento')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] border-[var(--color-primary,#AEEDD0)] shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterAll', {}, 'Todos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('expense')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'expense'
                    ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterExpenses', {}, 'Gastos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('income')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'income'
                    ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border-[var(--color-primary,#AEEDD0)]/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterIncomes', {}, 'Ingresos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('transfer')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'transfer'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterTransfers', {}, 'Transferencias')}
              </button>
            </div>
          </div>

          {/* Date Preset */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('transactions.dateRange', {}, 'Rango de Fecha')}
            </label>
            <CustomSelect
              options={datePresetOptions}
              value={datePreset}
              onChange={handlePresetChange}
            />
          </div>

          {/* Custom Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                {t('transactions.from', {}, 'Desde')}
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={(newDate) => {
                  setDatePreset('custom');
                  setStartDate(newDate);
                }}
                placeholder={t('transactions.from', {}, 'Desde')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                {t('transactions.to', {}, 'Hasta')}
              </label>
              <CustomDatePicker
                value={endDate}
                onChange={(newDate) => {
                  setDatePreset('custom');
                  setEndDate(newDate);
                }}
                placeholder={t('transactions.to', {}, 'Hasta')}
              />
            </div>
          </div>

          {/* Account Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('transactions.accountFilter', {}, 'Cuenta')}
            </label>
            <CustomSelect
              options={accountOptions}
              value={accountIdFilter}
              onChange={setAccountIdFilter}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('transactions.categoryFilter', {}, 'Categoría')}
            </label>
            <CustomSelect
              options={categoryOptions}
              value={categoryIdFilter}
              onChange={setCategoryIdFilter}
            />
          </div>
        </div>

        {/* Fixed Action Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0E171B] shrink-0 flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={() => {
              resetFilters();
              onClose();
            }}
            className="flex-1 py-3 border border-white/10 text-slate-300 font-medium rounded-xl hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('transactions.clearFilters', {}, 'Limpiar')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-[#5EEAD4] text-[#0A1316] font-semibold rounded-xl hover:bg-[#2DD4BF] transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>{t('common.apply', {}, 'Aplicar Filtros')}</span>
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
