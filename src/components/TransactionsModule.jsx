import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ArrowLeftRight, Search, Edit2, Trash2, Calendar, RotateCcw, Filter, X, SlidersHorizontal, Check, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import TransactionModal from './TransactionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AdvancedFiltersModal from './AdvancedFiltersModal';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ExportDropdown from './ExportDropdown';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';

export default function TransactionsModule() {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const { formatCurrency, t, language, exchangeRates, baseCurrency, formatToGlobal } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
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

    switch (preset) {
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(formatDateISO(start));
        setEndDate(formatDateISO(end));
        break;
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(formatDateISO(start));
        setEndDate(formatDateISO(end));
        break;
      }
      case 'last_30_days': {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        setStartDate(formatDateISO(start));
        setEndDate(formatDateISO(now));
        break;
      }
      case 'this_year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        setStartDate(formatDateISO(start));
        setEndDate(formatDateISO(end));
        break;
      }
      case 'all': {
        setStartDate('');
        setEndDate('');
        break;
      }
      default:
        break;
    }
  }, []);

  // Filter Active check & count
  const isFilterActive = useMemo(() => {
    return datePreset !== 'this_month' ||
      typeFilter !== 'all' ||
      accountIdFilter !== 'all' ||
      categoryIdFilter !== 'all' ||
      searchQuery.trim() !== '';
  }, [datePreset, typeFilter, accountIdFilter, categoryIdFilter, searchQuery]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (accountIdFilter !== 'all') count++;
    if (categoryIdFilter !== 'all') count++;
    if (datePreset !== 'this_month') count++;
    if (searchQuery.trim() !== '') count++;
    return count;
  }, [typeFilter, accountIdFilter, categoryIdFilter, datePreset, searchQuery]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setDatePreset('this_month');
    setStartDate(currentMonthStart);
    setEndDate(currentMonthEnd);
    setTypeFilter('all');
    setAccountIdFilter('all');
    setCategoryIdFilter('all');
    setSearchQuery('');
  }, [currentMonthStart, currentMonthEnd]);

  // Options for Dropdowns
  const datePresetOptions = useMemo(() => [
    { value: 'this_month', label: t('transactions.presets.thisMonth', {}, 'Este Mes') },
    { value: 'last_month', label: t('transactions.presets.lastMonth', {}, 'Mes Anterior') },
    { value: 'last_30_days', label: t('transactions.presets.last30Days', {}, 'Últimos 30 días') },
    { value: 'this_year', label: t('transactions.presets.thisYear', {}, 'Este Año') },
    { value: 'all', label: t('transactions.presets.allHistory', {}, 'Todo el Historial') },
    { value: 'custom', label: t('transactions.presets.custom', {}, 'Personalizado') }
  ], [t]);

  const accountOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allAccounts', {}, 'Todas las cuentas') },
    ...safeAccountsList.map(a => ({ value: a.id, label: `${a.emoji || '🏦'} ${a.name}` }))
  ], [safeAccountsList, t]);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allCategories', {}, 'Todas las categorías') },
    ...safeCategoriesList.map(c => ({ value: c.id, label: `${c.emoji || '🏷️'} ${c.name}` }))
  ], [safeCategoriesList, t]);

  // Filtering Logic
  const filteredTx = useMemo(() => {
    return safeTxList.filter((tx) => {
      if (!tx) return false;

      // Type Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Account Filter
      if (accountIdFilter !== 'all') {
        const matchAcc = tx.accountId === accountIdFilter || tx.targetAccountId === accountIdFilter;
        if (!matchAcc) return false;
      }

      // Category Filter
      if (categoryIdFilter !== 'all' && tx.categoryId !== categoryIdFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const catMatch = (safeCategoriesList.find(c => c?.id === tx.categoryId)?.name || '').toLowerCase().includes(query);
        const accMatch = (safeAccountsList.find(a => a?.id === tx.accountId)?.name || '').toLowerCase().includes(query);
        if (!descMatch && !catMatch && !accMatch) return false;
      }

      // Date Range Filter
      if (startDate && tx.date && tx.date < startDate) return false;
      if (endDate && tx.date && tx.date > endDate) return false;

      return true;
    });
  }, [safeTxList, typeFilter, accountIdFilter, categoryIdFilter, searchQuery, startDate, endDate, safeAccountsList, safeCategoriesList]);

  // Dynamic Totals Calculation
  const { totalIncome, totalExpense, netFlow } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTx.forEach(tx => {
      const val = Math.abs(formatToGlobal(tx));
      if (tx.type === 'income') inc += val;
      if (tx.type === 'expense') exp += val;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netFlow: inc - exp
    };
  }, [filteredTx, formatToGlobal]);

  // Smart Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, accountIdFilter, categoryIdFilter, searchQuery, startDate, endDate]);

  const totalPages = Math.ceil(filteredTx.length / pageSize) || 1;

  const paginatedTx = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTx.slice(start, start + pageSize);
  }, [filteredTx, currentPage, pageSize]);

  // Group transactions by date (only the paginated ones)
  const groupedTx = useMemo(() => {
    const groups = {};
    paginatedTx.forEach((tx) => {
      const dateKey = tx.date || t('transactions.noDate', {}, 'Sin fecha');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [paginatedTx, t]);

  // Sort dates descending
  const noDateLabel = t('transactions.noDate', {}, 'Sin fecha');
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTx).sort((a, b) => {
      if (a === noDateLabel) return 1;
      if (b === noDateLabel) return -1;
      return b.localeCompare(a);
    });
  }, [groupedTx, noDateLabel]);

  const handleSaveTx = useCallback(async (txData) => {
    if (!txData) return;
    if (txToEdit) {
      await updateTransaction(txData);
    } else {
      await addTransaction(txData);
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
    { label: t('modals.transaction.type', {}, 'Tipo'), accessor: (tx) => tx.type === 'expense' ? t('modals.transaction.typeExpense', {}, 'Gasto') : tx.type === 'income' ? t('modals.transaction.typeIncome', {}, 'Ingreso') : t('modals.transaction.typeTransfer', {}, 'Transferencia') },
    { label: t('modals.transaction.category', {}, 'Categoría'), accessor: (tx) => safeCategoriesList.find(c => c?.id === tx.categoryId)?.name || t('common.general', {}, 'General') },
    { label: t('modals.transaction.account', {}, 'Cuenta'), accessor: (tx) => safeAccountsList.find(a => a?.id === tx.accountId)?.name || t('common.general', {}, 'General') },
    { label: t('modals.transaction.amount', {}, 'Monto'), accessor: (tx) => `${tx.currency || 'USD'} ${Number(tx.amount || 0).toFixed(2)}` }
  ], [safeCategoriesList, safeAccountsList, t]);

    const transactionSummary = useMemo(() => ({
    totalRecords: filteredTx.length,
    consolidatedTotal: `${formatCurrency(netFlow, baseCurrency)} (Net Flow)`,
    baseCurrency
  }), [filteredTx.length, netFlow, baseCurrency, formatCurrency]);

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-28 md:pb-6">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate">
            {t('transactions.title', {}, 'Historial de Transacciones')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('transactions.subtitle', {}, 'Registro detallado de ingresos, gastos y transferencias')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setTxToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-11 md:h-10 px-3.5 sm:px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span>{t('transactions.newTransaction', {}, 'Nueva Transacción')}</span>
          </button>
        </div>
      </header>

      {/* KPI HERO BANNER: CONSOLIDATED NET CASH FLOW */}
      <SectionKpiHero
        title={t('transactions.netFlowHero', {}, language === 'es' ? 'FLUJO NETO CONSOLIDADO' : 'CONSOLIDATED NET FLOW')}
        formattedAmount={formatCurrency(netFlow, baseCurrency)}
        currency={baseCurrency}
        icon={netFlow >= 0 ? TrendingUp : TrendingDown}
        iconBgColor={netFlow >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'}
        iconBorderColor={netFlow >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}
        iconTextColor={netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        badgeText={currentMonthLabel}
        badgeColor="bg-white/5 text-slate-300 border-white/10"
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase block">
              {t('transactions.filterIncomes', {}, 'Ingresos')}
            </span>
            <span className="text-sm sm:text-base font-bold text-[var(--color-primary,#AEEDD0)] tabular-nums block mt-0.5">
              +{formatCurrency(totalIncome, baseCurrency)}
            </span>
          </div>
          <div className="text-left sm:text-right border-l border-white/10 pl-4 sm:pl-6">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase block">
              {t('transactions.filterExpenses', {}, 'Gastos')}
            </span>
            <span className="text-sm sm:text-base font-bold text-[#FF6B6B] tabular-nums block mt-0.5">
              -{formatCurrency(totalExpense, baseCurrency)}
            </span>
          </div>
        </div>
      </SectionKpiHero>

      {/* MOBILE COMPACT FILTER TOOLBAR (< lg) */}
      <div className="lg:hidden space-y-2.5 w-full relative z-20">
        {/* Full-width Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search', {}, 'Buscar por descripción, cuenta o categoría...')}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#162226] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
          />
        </div>

        {/* Quick Chips & Filter Trigger Row with Fluid Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1 pr-4">
          {/* Quick Type Chips */}
          <button
            onClick={() => setTypeFilter('all')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'all' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterAll', {}, 'Todos')}
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'expense' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterExpenses', {}, 'Gastos')}
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'income' ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterIncomes', {}, 'Ingresos')}
          </button>

          {/* Action Triggers: Filter Modal + Export */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border ${
              activeFilterCount > 0
                ? 'bg-[var(--color-primary,#AEEDD0)]/15 border-[var(--color-primary,#AEEDD0)]/40 text-[var(--color-primary,#AEEDD0)]'
                : 'bg-[#162226] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('common.filters', {}, 'Filtros')}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="lg:hidden shrink-0">
            <ExportDropdown
              data={filteredTx}
              columns={transactionColumns}
              title={t('transactions.title', {}, 'Historial de Transacciones')}
              filename="transacciones_growy"
              summary={transactionSummary}
            />
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center shrink-0 cursor-pointer"
              title={t('transactions.clearFilters', {}, 'Limpiar filtros')}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>{t('common.clear', {}, 'Limpiar')}</span>
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP FILTER BAR (>= lg) - UNIFIED SINGLE ROW */}
      <div className="hidden lg:block mb-6 relative z-30">
        <div className="flex items-center justify-between gap-3 p-2.5 bg-[#131E22]/90 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg flex-wrap">
          {/* Segmented Control de Tipo */}
          <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setTypeFilter('all')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'all' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterAll', {}, 'Todos')}
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'expense' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterExpenses', {}, 'Gastos')}
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'income' ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterIncomes', {}, 'Ingresos')}
            </button>
            <button
              onClick={() => setTypeFilter('transfer')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'transfer' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterTransfers', {}, 'Transferencias')}
            </button>
          </div>

          {/* Buscador */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search', {}, 'Buscar transacciones...')}
              className="w-full h-9 pl-9 pr-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#AEEDD0] transition-colors"
            />
          </div>

          {/* Selects Compactos de Rango, Cuenta, Categoría & Exportar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="min-w-[130px]">
              <CustomSelect
                options={datePresetOptions}
                value={datePreset}
                onChange={handlePresetChange}
              />
            </div>
            <div className="min-w-[130px]">
              <CustomSelect
                options={accountOptions}
                value={accountIdFilter}
                onChange={setAccountIdFilter}
              />
            </div>
            <div className="min-w-[130px]">
              <CustomSelect
                options={categoryOptions}
                value={categoryIdFilter}
                onChange={setCategoryIdFilter}
              />
            </div>
            <ExportDropdown
              data={filteredTx}
              columns={transactionColumns}
              title={t('transactions.title', {}, 'Historial de Transacciones')}
              filename="transacciones_growy"
              summary={transactionSummary}
            />
            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="h-11 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-rose-500/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                title={t('transactions.clearFilters', {}, 'Limpiar')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('transactions.clearFilters', {}, 'Limpiar')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Fechas personalizadas condicionales si el usuario elige "custom" */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 mt-2 animate-fadeIn">
            <div className="flex items-center gap-2 p-2 bg-[#131E22]/80 rounded-xl border border-white/10">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 pl-1">{t('transactions.from', {}, 'Desde')}</span>
              <div className="w-32">
                <CustomDatePicker
                  value={startDate}
                  onChange={(newDate) => setStartDate(newDate)}
                  placeholder={t('transactions.from', {}, 'Desde')}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">—</span>
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">{t('transactions.to', {}, 'Hasta')}</span>
              <div className="w-32">
                <CustomDatePicker
                  value={endDate}
                  onChange={(newDate) => setEndDate(newDate)}
                  placeholder={t('transactions.to', {}, 'Hasta')}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE ADVANCED FILTER MODAL VIA PORTAL */}
      <AdvancedFiltersModal
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        handlePresetChange={handlePresetChange}
        datePresetOptions={datePresetOptions}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        accountIdFilter={accountIdFilter}
        setAccountIdFilter={setAccountIdFilter}
        accountOptions={accountOptions}
        categoryIdFilter={categoryIdFilter}
        setCategoryIdFilter={setCategoryIdFilter}
        categoryOptions={categoryOptions}
        activeFilterCount={activeFilterCount}
        resetFilters={resetFilters}
      />      {/* Structured High-Density Feed */}
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
                    const acc = safeAccountsList.find(a => a?.id === tx.accountId) || { name: t('common.generalAccount', {}, 'Cuenta General') };
                    const cat = safeCategoriesList.find(c => c?.id === tx.categoryId) || { name: t('common.general', {}, 'General'), emoji: '📌' };

                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const emoji = tx.type === 'transfer' ? '🔁' : (cat?.emoji || '💰');

                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          setTxToEdit(tx);
                          setIsModalOpen(true);
                        }}
                        className="p-3.5 sm:px-5 sm:py-3.5 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-all group cursor-pointer"
                      >
                        {/* Col 1 (Izquierda): Icono + Concepto */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isIncome ? 'bg-[var(--color-primary,#AEEDD0)]/15 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/20' : isExpense ? 'bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/20' : 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
                          }`}>
                            {emoji}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 sm:truncate text-sm font-semibold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors">
                              {tx.description || cat?.name || t('transactions.movement', {}, 'Movimiento')}
                            </h4>
                            <p className="text-xs text-slate-300 font-medium sm:hidden truncate mt-0.5">
                              {acc?.name} • {cat?.name}
                            </p>
                          </div>
                        </div>

                        {/* Col 2 (Centro-Izquierda): Badge de Cuenta y Categoría (Desktop) */}
                        <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]">
                            🏦 {acc?.name || t('transactions.accountFilter', {}, 'Cuenta')}
                          </span>
                          <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]">
                            🏷️ {cat?.name || t('transactions.categoryFilter', {}, 'Categoría')}
                          </span>
                        </div>

                        {/* Col 3 (Centro-Derecha): Fecha legible (Desktop) */}
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0 w-28">
                          <span>🕒 {tx.date}</span>
                        </div>

                        {/* Col 4 (Derecha): Monto formateado grande + Botones en hover */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`text-base font-bold tabular-nums ${isIncome ? 'text-[var(--color-primary,#AEEDD0)]' : isExpense ? 'text-[#FF6B6B]' : 'text-sky-300'}`}>
                            {isIncome ? '+ ' : isExpense ? '- ' : ''}
                            {formatCurrency(tx.amount, tx.currency || acc?.currency || 'USD')}
                          </div>

                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTxToDelete(tx);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title={t('common.delete', {}, 'Eliminar')}
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Universal Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredTx.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

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
        itemName={txToDelete?.description || t('transactions.movement', {}, 'movimiento')}
        itemType={t('transactions.transactionItemType', {}, 'transacción')}
      />

    </div>
  );
}
