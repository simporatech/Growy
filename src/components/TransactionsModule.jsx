import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ArrowLeftRight, Search, Edit2, Trash2, Calendar, RotateCcw } from 'lucide-react';
import TransactionModal from './TransactionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ExportDropdown from './ExportDropdown';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO } from '../utils/formatters';

export default function TransactionsModule() {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const { formatCurrency, t, language } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState(null);
  const [txToDelete, setTxToDelete] = useState(null);

  // Today & Month calculations for default filters
  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);
  const currentMonth = useMemo(() => today.getMonth(), [today]);

  const currentMonthStart = useMemo(() => formatDateISO(new Date(currentYear, currentMonth, 1)), [currentYear, currentMonth]);
  const currentMonthEnd = useMemo(() => formatDateISO(new Date(currentYear, currentMonth + 1, 0)), [currentYear, currentMonth]);

  // Multivariable Filter States
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(currentMonthEnd);
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountIdFilter, setAccountIdFilter] = useState('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const safeTxList = useMemo(() => Array.isArray(transactions) ? transactions.filter(Boolean) : [], [transactions]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);

  // Handle Date Preset Changes
  const handlePresetChange = useCallback((preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'this_month') {
      setStartDate(formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1)));
      setEndDate(formatDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (preset === 'last_month') {
      setStartDate(formatDateISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setEndDate(formatDateISO(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (preset === 'last_90_days') {
      const past90 = new Date();
      past90.setDate(past90.getDate() - 90);
      setStartDate(formatDateISO(past90));
      setEndDate(formatDateISO(now));
    } else if (preset === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  }, []);

  // Preset Options for CustomSelect
  const datePresetOptions = useMemo(() => [
    { value: 'this_month', label: t('common.thisMonth', {}, 'Este Mes') },
    { value: 'last_month', label: t('transactions.lastMonth', {}, 'Mes Pasado') },
    { value: 'last_90_days', label: t('transactions.last90Days', {}, 'Últimos 90 Días') },
    { value: 'all_time', label: t('transactions.allTime', {}, 'Todo el Historial') },
    { value: 'custom', label: t('transactions.customRange', {}, 'Personalizado') }
  ], [t]);

  // Reset Filters back to Default (Current Month)
  const resetFilters = useCallback(() => {
    setDatePreset('this_month');
    const now = new Date();
    setStartDate(formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(formatDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    setTypeFilter('all');
    setAccountIdFilter('all');
    setCategoryIdFilter('all');
    setSearchQuery('');
  }, []);

  const isFilterActive = useMemo(() => {
    return (
      datePreset !== 'this_month' ||
      typeFilter !== 'all' ||
      accountIdFilter !== 'all' ||
      categoryIdFilter !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [datePreset, typeFilter, accountIdFilter, categoryIdFilter, searchQuery]);

  // Account Dropdown Options
  const accountOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allAccounts', {}, 'Todas las cuentas') },
    ...safeAccountsList.map(acc => ({
      value: acc.id,
      label: `${acc.emoji || '💳'} ${acc.name}`
    }))
  ], [safeAccountsList, t]);

  // Category Dropdown Options
  const categoryOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allCategories', {}, 'Todas las categorías') },
    ...safeCategoriesList.map(cat => ({
      value: cat.id,
      label: `${cat.emoji || '🏷️'} ${cat.name}`
    }))
  ], [safeCategoriesList, t]);

  // Apply Multivariable Filtering
  const filteredTx = useMemo(() => {
    return safeTxList.filter(tx => {
      if (!tx) return false;

      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (accountIdFilter !== 'all' && tx.accountId !== accountIdFilter && tx.targetAccountId !== accountIdFilter) {
        return false;
      }
      if (categoryIdFilter !== 'all' && tx.categoryId !== categoryIdFilter) {
        return false;
      }
      if (startDate && tx.date && tx.date < startDate) return false;
      if (endDate && tx.date && tx.date > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const cat = (safeCategoriesList.find(c => c?.id === tx.categoryId)?.name || '').toLowerCase();
        const acc = (safeAccountsList.find(a => a?.id === tx.accountId)?.name || '').toLowerCase();
        return desc.includes(q) || cat.includes(q) || acc.includes(q);
      }

      return true;
    });
  }, [safeTxList, typeFilter, accountIdFilter, categoryIdFilter, startDate, endDate, searchQuery, safeCategoriesList, safeAccountsList]);

  // Group filtered transactions by date
  const groupedTx = useMemo(() => {
    return filteredTx.reduce((groups, tx) => {
      const dateStr = tx.date || 'Sin fecha';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(tx);
      return groups;
    }, {});
  }, [filteredTx]);

  const sortedDates = useMemo(() => Object.keys(groupedTx).sort((a, b) => new Date(b) - new Date(a)), [groupedTx]);

  const handleSaveTx = useCallback((txData) => {
    if (!txData) return;
    if (txToEdit) {
      updateTransaction(txData);
    } else {
      addTransaction(txData);
    }
    setTxToEdit(null);
  }, [txToEdit, updateTransaction, addTransaction]);

  const handleDeleteTx = useCallback(() => {
    if (!txToDelete) return;
    deleteTransaction(txToDelete.id);
    setTxToDelete(null);
  }, [txToDelete, deleteTransaction]);

  const currentMonthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    const monthName = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }, [currentYear, currentMonth, language]);

  const transactionColumns = useMemo(() => [
    { label: t('modals.transaction.date', {}, 'Fecha'), accessor: (tx) => tx.date || '-' },
    { label: t('modals.transaction.description', {}, 'Descripción'), accessor: (tx) => tx.description || '-' },
    { label: t('modals.transaction.type', {}, 'Tipo'), accessor: (tx) => tx.type === 'expense' ? 'Gasto' : tx.type === 'income' ? 'Ingreso' : 'Transferencia' },
    { label: t('modals.transaction.category', {}, 'Categoría'), accessor: (tx) => safeCategoriesList.find(c => c?.id === tx.categoryId)?.name || 'General' },
    { label: t('modals.transaction.account', {}, 'Cuenta'), accessor: (tx) => safeAccountsList.find(a => a?.id === tx.accountId)?.name || 'General' },
    { label: t('modals.transaction.amount', {}, 'Monto'), accessor: (tx) => `${tx.currency || 'USD'} ${Number(tx.amount || 0).toFixed(2)}` }
  ], [safeCategoriesList, safeAccountsList, t]);

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      
      {/* Standardized Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full relative z-30">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {t('transactions.title', {}, 'Historial de Transacciones')}
          </h1>
          <p className="text-sm text-slate-300 mt-1 block font-normal flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary,#AEEDD0)]" />
            <span>
              {t('transactions.showingFor', { month: currentMonthLabel }, `Mostrando movimientos de ${currentMonthLabel}`)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <ExportDropdown
            data={filteredTx}
            columns={transactionColumns}
            title={t('transactions.title', {}, 'Historial de Transacciones')}
            filename="transacciones_growy"
          />

          <button
            onClick={() => {
              setTxToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-10 px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t('transactions.newTransaction', {}, 'Nuevo Movimiento')}</span>
          </button>
        </div>
      </header>

      {/* High-Density Filter Bar */}
      <div className="p-6 md:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4 relative z-30">
        
        {/* Row 1: Type Pills, Search & Clear Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Type Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'all' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterAll', {}, 'Todos los tipos')}
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'expense' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterExpenses', {}, 'Gastos')}
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'income' ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterIncomes', {}, 'Ingresos')}
            </button>
            <button
              onClick={() => setTypeFilter('transfer')}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'transfer' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterTransfers', {}, 'Transferencias')}
            </button>
          </div>

          {/* Text Search & Clear Button */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search', {}, 'Buscar...')}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#162226] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
              />
            </div>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('transactions.clearFilters', {}, 'Limpiar Filtros')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Range Preset, Account, Category & Custom DatePickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/5">
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
              {t('transactions.dateRange', {}, 'Rango de Fecha')}
            </label>
            <CustomSelect
              options={datePresetOptions}
              value={datePreset}
              onChange={handlePresetChange}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
              {t('transactions.accountFilter', {}, 'Cuenta')}
            </label>
            <CustomSelect
              options={accountOptions}
              value={accountIdFilter}
              onChange={setAccountIdFilter}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
              {t('transactions.categoryFilter', {}, 'Categoría')}
            </label>
            <CustomSelect
              options={categoryOptions}
              value={categoryIdFilter}
              onChange={setCategoryIdFilter}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
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

        </div>

      </div>

      {/* Structured High-Density Feed */}
      <div className="w-full space-y-6 relative z-10">
        {sortedDates.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#1E2D32]/60 border border-white/10 backdrop-blur-md text-center text-slate-300 space-y-3">
            <ArrowLeftRight className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-white">{t('transactions.noTxTitle', {}, 'No hay transacciones registradas')}</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto font-medium">
              {t('transactions.noTxDesc', {}, 'Tus movimientos aparecerán aquí conforme los vayas registrando.')}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-5 rounded-xl btn-primary-mint font-bold text-sm inline-flex items-center gap-2 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t('dashboard.registerMovement', {}, 'Registrar Movimiento')}
            </button>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const list = groupedTx[dateStr] || [];
            
            return (
              <div key={dateStr} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">
                  {dateStr}
                </div>

                <div className="space-y-2">
                  {list.map((tx) => {
                    const acc = safeAccountsList.find(a => a?.id === tx.accountId) || { name: 'Cuenta General' };
                    const cat = safeCategoriesList.find(c => c?.id === tx.categoryId) || { name: 'General', emoji: '📌' };

                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const emoji = tx.type === 'transfer' ? '🔁' : (cat?.emoji || '💰');

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-all group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${
                            isIncome ? 'bg-[var(--color-primary,#AEEDD0)]/15 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/20' : isExpense ? 'bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/20' : 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
                          }`}>
                            {emoji}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors truncate">
                              {tx.description || cat?.name || 'Movimiento'}
                            </h4>
                            <p className="text-xs text-slate-300 font-medium truncate">{acc?.name} • {cat?.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`text-sm font-bold tabular-nums ${isIncome ? 'text-[var(--color-primary,#AEEDD0)]' : isExpense ? 'text-[#FF6B6B]' : 'text-sky-300'}`}>
                            {isIncome ? '+ ' : isExpense ? '- ' : ''}
                            {formatCurrency(tx.amount, acc.currency || tx.currency)}
                          </div>

                          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setTxToEdit(tx);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-[var(--color-primary,#AEEDD0)] hover:bg-white/10 transition-colors"
                              title={t('common.edit', {}, 'Editar')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title={t('common.delete', {}, 'Eliminar')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTxToEdit(null);
        }}
        onSave={handleSaveTx}
        transactionToEdit={txToEdit}
        accounts={safeAccountsList}
        categories={safeCategoriesList}
      />

      <ConfirmDeleteModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteTx}
        itemName={txToDelete?.description || 'movimiento'}
        itemType="transacción"
      />

    </div>
  );
}
