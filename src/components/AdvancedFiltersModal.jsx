import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, RotateCcw, Check } from 'lucide-react';
import Button from './Button';
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
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-transparent cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer / Modal Container */}
      <div 
        role="dialog"
        aria-modal="true"
        className="modal-container relative z-10 w-full max-w-lg max-h-[85vh] bg-[#0A0D14] flex flex-col rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden animate-scaleUp"
      >
        
        {/* Header */}
        <div className="modal-header p-5 border-b border-white/[0.06] shrink-0 bg-[#0A0D14] relative">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2 mb-3 sm:hidden" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('transactions.advancedFilters', {}, 'Filtros Avanzados')}
                </h3>
                {activeFilterCount > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--accent,#97F2CC)]">
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
                    ? 'bg-slate-800 text-white border-white/20 shadow-sm'
                    : 'bg-[#121721] border-white/[0.08] text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterAll', {}, 'Todos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('expense')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'expense'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                    : 'bg-[#121721] border-white/[0.08] text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterExpense', {}, 'Gastos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('income')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-[#121721] border-white/[0.08] text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterIncome', {}, 'Ingresos')}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('transfer')}
                className={`h-11 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  typeFilter === 'transfer'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm'
                    : 'bg-[#121721] border-white/[0.08] text-slate-300 hover:bg-white/10'
                }`}
              >
                {t('transactions.filterTransfer', {}, 'Transferencias')}
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
        <div className="modal-footer p-4 border-t border-white/[0.06] bg-transparent shrink-0 flex items-center gap-3 z-10">
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={RotateCcw}
            onClick={() => {
              resetFilters();
              onClose();
            }}
            className="flex-1"
          >
            <span>{t('transactions.clearFilters', {}, 'Limpiar')}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            icon={Check}
            onClick={onClose}
            className="flex-1"
          >
            <span>{t('transactions.applyFilters', {}, 'Aplicar')}</span>
          </Button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
