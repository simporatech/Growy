import React, { useState, useMemo, useCallback } from 'react';
import { Plus, ArrowLeftRight, Search, Trash2, RotateCcw, Filter, TrendingUp, TrendingDown } from 'lucide-react';
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

  // Month Navigation
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Filter States
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return formatDateISO(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });
  const [accountIdFilter, setAccountIdFilter] = useState('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('all');

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
    return (
      typeFilter !== 'all' ||
      searchQuery.trim() !== '' ||
      datePreset !== 'this_month' ||
      accountIdFilter !== 'all' ||
      categoryIdFilter !== 'all'
    );
  }, [typeFilter, searchQuery, datePreset, accountIdFilter, categoryIdFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (datePreset !== 'this_month') count++;
    if (accountIdFilter !== 'all') count++;
    if (categoryIdFilter !== 'all') count++;
    return count;
  }, [typeFilter, searchQuery, datePreset, accountIdFilter, categoryIdFilter]);

  const resetFilters = useCallback(() => {
    setTypeFilter('all');
    setSearchQuery('');
    handlePresetChange('this_month');
    setAccountIdFilter('all');
    setCategoryIdFilter('all');
  }, [handlePresetChange]);

  // Options for Dropdowns
  const datePresetOptions = useMemo(() => [
    { value: 'this_month', label: t('transactions.presets.thisMonth', {}, 'Este Mes') },
    { value: 'last_month', label: t('transactions.presets.lastMonth', {}, 'Mes Anterior') },
    { value: 'last_30_days', label: t('transactions.presets.last30Days', {}, 'Últimos 30 Días') },
    { value: 'this_year', label: t('transactions.presets.thisYear', {}, 'Este Año') },
    { value: 'all', label: t('transactions.presets.allHistory', {}, 'Todo el Historial') },
    { value: 'custom', label: t('transactions.presets.custom', {}, 'Personalizado') }
  ], [t]);

  const accountOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allAccounts', {}, 'Todas las Cuentas') },
    ...safeAccountsList.map(a => ({ value: a.id, label: `${a.emoji || '🏦'} ${a.name}` }))
  ], [safeAccountsList, t]);

  const categoryOptions = useMemo(() => [
    { value: 'all', label: t('transactions.allCategories', {}, 'Todas las Categorías') },
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
      const dateKey = tx.date || t('transactions.noDate', {}, 'Sin Fecha');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [paginatedTx, t]);

  // Sort dates descending
  const noDateLabel = t('transactions.noDate', {}, 'Sin Fecha');
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

  const isEs = language === 'es';

  const transactionColumns = useMemo(() => [
    { 
      label: isEs ? 'Fecha' : 'Date', 
      accessor: (tx) => tx?.date || tx?.transactionDate || tx?.transaction_date || '-' 
    },
    { 
      label: isEs ? 'Descripción' : 'Description', 
      accessor: (tx) => {
        if (tx?.type === 'transfer') {
          const src = safeAccountsList.find(a => a?.id === (tx?.accountId || tx?.account_id))?.name || '-';
          const dest = safeAccountsList.find(a => a?.id === (tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id))?.name || '';
          return dest ? `${src} ➔ ${dest}` : (tx?.description || (isEs ? 'Transferencia' : 'Transfer'));
        }
        return tx?.description || '-';
      }
    },
    { 
      label: isEs ? 'Cuenta Origen' : 'Account', 
      accessor: (tx) => safeAccountsList.find(a => a?.id === (tx?.accountId || tx?.account_id))?.name || '-' 
    },
    { 
      label: isEs ? 'Cuenta Destino' : 'Destination Account', 
      accessor: (tx) => tx?.type === 'transfer' ? (safeAccountsList.find(a => a?.id === (tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id))?.name || '-') : '-' 
    },
    { 
      label: isEs ? 'Categoría' : 'Category', 
      accessor: (tx) => safeCategoriesList.find(c => c?.id === (tx?.categoryId || tx?.category_id))?.name || (isEs ? 'General' : 'General') 
    },
    { 
      label: isEs ? 'Tipo' : 'Type', 
      accessor: (tx) => tx?.type === 'expense' ? (isEs ? 'Gasto' : 'Expense') : tx?.type === 'income' ? (isEs ? 'Ingreso' : 'Income') : (isEs ? 'Transferencia' : 'Transfer') 
    },
    { 
      label: isEs ? 'Monto' : 'Amount', 
      accessor: (tx) => Number(tx?.amount || 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Moneda' : 'Currency', 
      accessor: (tx) => tx?.currency || 'USD' 
    },
    { 
      label: isEs ? `Monto Base (${baseCurrency})` : `Base Amount (${baseCurrency})`, 
      accessor: (tx) => convertCrossCurrency(Number(tx?.amount || 0), tx?.currency || 'USD', baseCurrency, exchangeRates).toFixed(2) 
    }
  ], [safeCategoriesList, safeAccountsList, isEs, baseCurrency, exchangeRates]);

  const transactionSummary = useMemo(() => ({
    totalRecords: filteredTx.length,
    consolidatedTotal: `${formatCurrency(netFlow, baseCurrency)}`,
    baseCurrency
  }), [filteredTx.length, netFlow, baseCurrency, formatCurrency]);

  const exportFilename = isEs ? 'Growy_Transacciones' : 'Growy_Transactions';

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
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
            className="h-11 md:h-10 px-3.5 sm:px-4 text-xs font-semibold rounded-xl bg-[#97F2CC] text-[#091E15] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#97F2CC]/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span className="hidden sm:inline">{t('transactions.newTransaction', {}, 'Nueva Transacción')}</span>
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
            <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums block mt-0.5">
              +{formatCurrency(totalIncome, baseCurrency)}
            </span>
          </div>
          <div className="text-left sm:text-right border-l border-white/10 pl-4 sm:pl-6">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase block">
              {t('transactions.filterExpenses', {}, 'Gastos')}
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-400 tabular-nums block mt-0.5">
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
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#162226] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#97F2CC] shadow-inner transition-colors"
          />
        </div>

        {/* Quick Chips & Filter Trigger Row with Fluid Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1 pr-4">
          {/* Quick Type Chips */}
          <button
            onClick={() => setTypeFilter('all')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'all' ? 'bg-slate-800 text-white border border-white/20 shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterAll', {}, 'Todos')}
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'expense' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterExpenses', {}, 'Gastos')}
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center shrink-0 cursor-pointer ${
              typeFilter === 'income' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'bg-white/5 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            {t('transactions.filterIncomes', {}, 'Ingresos')}
          </button>

          {/* Action Triggers: Filter Modal + Export */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border ${
              activeFilterCount > 0
                ? 'bg-white/15 border-white/40 text-white'
                : 'bg-[#162226] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('common.filters', {}, 'Filtros')}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#091E15] text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="lg:hidden shrink-0">
            <ExportDropdown
              data={filteredTx}
              columns={transactionColumns}
              title={t('transactions.title', {}, 'Historial de Transacciones')}
              filename={exportFilename}
              summary={transactionSummary}
            />
          </div>

          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center shrink-0 cursor-pointer"
              title={t('transactions.clearFilters', {}, 'Limpiar Filtros')}
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
                typeFilter === 'all' ? 'bg-slate-800 text-white border border-white/20 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterAll', {}, 'Todos')}
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'expense' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterExpenses', {}, 'Gastos')}
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'income' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('transactions.filterIncomes', {}, 'Ingresos')}
            </button>
            <button
              onClick={() => setTypeFilter('transfer')}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center cursor-pointer ${
                typeFilter === 'transfer' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:text-white'
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
              filename={exportFilename}
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
          <div className="p-6 rounded-2xl glass-card text-center text-slate-300 space-y-3">
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
                    const sourceAcc = safeAccountsList.find(a => a?.id === (tx?.accountId || tx?.account_id));
                    const destAcc = safeAccountsList.find(a => a?.id === (tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id));
                    const cat = safeCategoriesList.find(c => c?.id === (tx?.categoryId || tx?.category_id));

                    const sourceAccName = sourceAcc?.name || t('transactions.accountFilter', {}, 'Cuenta');
                    const destAccName = destAcc?.name || '';
                    const catName = cat?.name || t('transactions.categoryFilter', {}, 'General');

                    const isIncome = tx?.type === 'income';
                    const isExpense = tx?.type === 'expense';
                    const isTransfer = tx?.type === 'transfer';
                    const emoji = isTransfer ? '🔁' : (cat?.emoji || '💰');

                    const txTitle = isTransfer && destAccName
                      ? `${sourceAccName} ➔ ${destAccName}`
                      : (tx?.description || catName || t('transactions.movement', {}, 'Movimiento'));

                    const displayDate = tx?.date || tx?.transactionDate || tx?.transaction_date || dateStr;

                    return (
                      <div
                        key={tx?.id || Math.random()}
                        onClick={() => {
                          setTxToEdit(tx);
                          setIsModalOpen(true);
                        }}
                        className="p-3.5 sm:px-5 sm:py-3.5 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-all group cursor-pointer"
                      >
                        {/* Col 1 (Izquierda): Icono + Concepto */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                            isIncome ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : isExpense ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          }`}>
                            {emoji}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 sm:truncate text-sm font-semibold text-white group-hover:text-slate-200 transition-colors">
                              {txTitle}
                            </h4>
                            <p className="text-xs text-slate-300 font-medium sm:hidden truncate mt-0.5">
                              {sourceAccName} • {catName}
                            </p>
                          </div>
                        </div>

                        {/* Col 2 (Centro-Izquierda): Badge de Cuenta y Categoría (Desktop) */}
                        <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]">
                            🏦 {sourceAccName}
                          </span>
                          <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]">
                            🏷️ {catName}
                          </span>
                        </div>

                        {/* Col 3 (Centro-Derecha): Fecha legible (Desktop) */}
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0 w-28">
                          <span>🕒 {displayDate}</span>
                        </div>

                        {/* Col 4 (Derecha): Monto formateado grande + Botones en hover */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`text-base font-bold tabular-nums ${isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-sky-400'}`}>
                            {isIncome ? '+ ' : isExpense ? '- ' : ''}
                            {formatCurrency ? formatCurrency(tx?.amount, tx?.currency || sourceAcc?.currency || 'USD') : `${tx?.amount}`}
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
