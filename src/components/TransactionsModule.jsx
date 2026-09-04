import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, ArrowLeftRight, Search, Trash2, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import Button from './Button';
import EmptyState from './common/EmptyState';
import TransactionModal from './TransactionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ExportDropdown from './ExportDropdown';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO, formatLoanDescription } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';
import DynamicIcon from './DynamicIcon';

export default function TransactionsModule() {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction, isLoading, isInitialized } = useFinance();
  const { formatCurrency, t, language, exchangeRates, baseCurrency, formatToGlobal } = useSettings();
  const isEs = language === 'es';

  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const safeTxList = useMemo(() => Array.isArray(transactions) ? transactions.filter(Boolean) : [], [transactions]);
  const safeAccountsList = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return [...list].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [accounts]);
  const safeCategoriesList = useMemo(() => {
    const list = Array.isArray(categories) ? categories.filter(Boolean) : [];
    return [...list].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [categories]);

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
      selectedAccountIds.length > 0 ||
      selectedCategoryIds.length > 0 ||
      currencyFilter !== 'all'
    );
  }, [typeFilter, searchQuery, datePreset, selectedAccountIds, selectedCategoryIds, currencyFilter]);

  const resetFilters = useCallback(() => {
    setTypeFilter('all');
    setSearchQuery('');
    handlePresetChange('this_month');
    setSelectedAccountIds([]);
    setSelectedCategoryIds([]);
    setCurrencyFilter('all');
  }, [handlePresetChange]);

  // Options for Dropdowns
  const typeOptions = useMemo(() => [
    { value: 'all', label: t('transactions.filterAll', {}, language === 'es' ? 'Todos los tipos' : 'All Types') },
    { value: 'expense', label: t('transactions.filterExpenses', {}, language === 'es' ? 'Gastos' : 'Expenses'), emoji: '📉' },
    { value: 'income', label: t('transactions.filterIncomes', {}, language === 'es' ? 'Ingresos' : 'Income'), emoji: '📈' },
    { value: 'transfer', label: t('transactions.filterTransfers', {}, language === 'es' ? 'Transferencias' : 'Transfers'), emoji: '🔄' }
  ], [t, language]);

  const datePresetOptions = useMemo(() => [
    { value: 'this_month', label: t('transactions.presets.thisMonth', {}, language === 'es' ? 'Este Mes' : 'This Month') },
    { value: 'last_month', label: t('transactions.presets.lastMonth', {}, language === 'es' ? 'Mes Anterior' : 'Last Month') },
    { value: 'last_30_days', label: t('transactions.presets.last30Days', {}, language === 'es' ? 'Últimos 30 Días' : 'Last 30 Days') },
    { value: 'this_year', label: t('transactions.presets.thisYear', {}, language === 'es' ? 'Este Año' : 'This Year') },
    { value: 'all', label: t('transactions.presets.allHistory', {}, language === 'es' ? 'Todo el Historial' : 'All History') },
    { value: 'custom', label: t('transactions.presets.custom', {}, language === 'es' ? 'Personalizado' : 'Custom Range') }
  ], [t, language]);

  const accountOptions = useMemo(() => [
    ...safeAccountsList.map(a => ({ 
      value: a.id, 
      name: a.name, 
      emoji: a.emoji || '🏦', 
      currency: a.currency || 'USD',
      label: a.name 
    }))
  ], [safeAccountsList]);

  const categoryOptions = useMemo(() => [
    ...safeCategoriesList.map(c => ({ 
      value: c.id, 
      name: c.name, 
      emoji: c.emoji || '🏷️', 
      label: c.name 
    }))
  ], [safeCategoriesList]);

  const currencyOptions = useMemo(() => {
    const set = new Set(safeTxList.map(t => t.currency || baseCurrency));
    if (baseCurrency) set.add(baseCurrency);
    return [
      { value: 'all', label: t('common.allCurrencies', {}, language === 'es' ? 'Todas las divisas' : 'All Currencies'), emoji: '🌐' },
      ...Array.from(set).map(c => ({
        value: c,
        label: c,
        name: c,
        emoji: '💱'
      }))
    ];
  }, [safeTxList, baseCurrency, t, language]);

  // Filtering Logic
  const filteredTx = useMemo(() => {
    return safeTxList.filter((tx) => {
      if (!tx) return false;

      // 1. Type Filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // 2. Currency Filter
      if (currencyFilter !== 'all' && (tx.currency || baseCurrency) !== currencyFilter) return false;

      // 3. Account Filter (Multi-select: match if any selected account matches source or destination)
      if (selectedAccountIds.length > 0) {
        const txAccId = String(tx.accountId || tx.account_id || '');
        const txDestId = String(tx.targetAccountId || tx.destinationAccountId || tx.destination_account_id || '');
        const matchAcc = selectedAccountIds.some(id => String(id) === txAccId || String(id) === txDestId);
        if (!matchAcc) return false;
      }

      // 4. Category Filter (Multi-select)
      if (selectedCategoryIds.length > 0) {
        const txCatId = String(tx.categoryId || tx.category_id || '');
        const matchCat = selectedCategoryIds.some(id => String(id) === txCatId);
        if (!matchCat) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const catId = tx.categoryId || tx.category_id;
        const catMatch = catId ? (safeCategoriesList.find(c => c?.id === catId)?.name || '').toLowerCase().includes(query) : false;
        const accId = tx.accountId || tx.account_id;
        const accMatch = (safeAccountsList.find(a => a?.id === accId)?.name || '').toLowerCase().includes(query);
        if (!descMatch && !catMatch && !accMatch) return false;
      }

      // 6. Date Range Filter (Safe ISO date string comparison)
      const rawDate = tx.date || tx.transactionDate || tx.transaction_date || '';
      const txDate = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : '';
      if (startDate && txDate && txDate < startDate) return false;
      if (endDate && txDate && txDate > endDate) return false;

      return true;
    });
  }, [safeTxList, typeFilter, currencyFilter, selectedAccountIds, selectedCategoryIds, searchQuery, startDate, endDate, safeAccountsList, safeCategoriesList, baseCurrency]);

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
  const [pageSize, setPageSize] = React.useState(30);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, currencyFilter, selectedAccountIds, selectedCategoryIds, searchQuery, startDate, endDate]);

  const totalPages = Math.ceil(filteredTx.length / pageSize) || 1;

  const paginatedTx = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTx.slice(start, start + pageSize);
  }, [filteredTx, currentPage, pageSize]);

  // Group transactions by date (only the paginated ones)
  const groupedTx = useMemo(() => {
    const groups = {};
    paginatedTx.forEach((tx) => {
      const rawDate = tx.date || tx.transactionDate || tx.transaction_date || '';
      const dateKey = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : t('transactions.noDate', {}, 'Sin Fecha');
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
          const destId = tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id;
          const dest = safeAccountsList.find(a => a?.id === destId)?.name;
          const isLoan = Boolean(tx?.debtId || tx?.debt_id || (!destId && /(pr[eé]stamo|loan)/i.test(tx?.description || '')) || (!destId && tx?.type === 'transfer'));
          const virtualName = t('debts.virtual_account_name', {}, isEs ? 'Saldos Pendientes (Por Cobrar)' : 'Pending Balances (Receivable)');
          const destName = dest || (isLoan ? virtualName : '');
          const localizedDesc = formatLoanDescription(tx?.description, isEs);
          return destName ? `${src} ➔ ${destName}` : (localizedDesc || (isEs ? 'Transferencia' : 'Transfer'));
        }
        return formatLoanDescription(tx?.description, isEs) || '-';
      }
    },
    { 
      label: isEs ? 'Cuenta Origen' : 'Account', 
      accessor: (tx) => safeAccountsList.find(a => a?.id === (tx?.accountId || tx?.account_id))?.name || '-' 
    },
    { 
      label: isEs ? 'Cuenta Destino' : 'Destination Account', 
      accessor: (tx) => {
        if (tx?.type !== 'transfer') return '-';
        const destId = tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id;
        const dest = safeAccountsList.find(a => a?.id === destId);
        if (dest) return dest.name;
        const isLoan = Boolean(tx?.debtId || tx?.debt_id || (!destId && /(pr[eé]stamo|loan)/i.test(tx?.description || '')) || !destId);
        if (isLoan) return t('debts.virtual_account_name', {}, isEs ? 'Saldos Pendientes (Por Cobrar)' : 'Pending Balances (Receivable)');
        return '-';
      }
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
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('transactions.title', {}, 'Historial de Transacciones')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('transactions.subtitle', {}, 'Registro detallado de ingresos, gastos y transferencias')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown
            data={filteredTx}
            columns={transactionColumns}
            title={t('transactions.title', {}, 'Historial de Transacciones')}
            filename={exportFilename}
            summary={transactionSummary}
          />
          <button
            type="button"
            onClick={() => {
              setTxToEdit(null);
              setIsModalOpen(true);
            }}
            className="bg-[var(--accent)] text-black font-semibold h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title={t('transactions.newTransaction', {}, 'Nueva Transacción')}
          >
            <Plus className="w-4 h-4" />
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
        iconBgColor={netFlow >= 0 ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))]' : 'bg-rose-500/15'}
        iconBorderColor={netFlow >= 0 ? 'border-[var(--accent,#97F2CC)]/30' : 'border-rose-500/30'}
        iconTextColor={netFlow >= 0 ? 'text-[var(--accent,#97F2CC)]' : 'text-rose-400'}
        badgeText={currentMonthLabel}
        badgeColor="bg-white/5 text-slate-300 border-white/10"
        isLoading={isLoading || !isInitialized}
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

      {/* UNIFIED CARBON-GRAY FILTER BAR */}
      <div className="w-full bg-[#0D1117]/90 border border-white/10 rounded-2xl p-3 gap-2.5 sm:gap-3 flex flex-wrap items-center relative z-20 backdrop-blur-xl shadow-lg">
        {/* 1. Tipo de Transacción */}
        <div className="w-[125px] sm:w-[135px] shrink-0">
          <CustomSelect
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            isSmall
          />
        </div>

        {/* 2. Período */}
        <div className="w-[135px] sm:w-[145px] shrink-0">
          <CustomSelect
            options={datePresetOptions}
            value={datePreset}
            onChange={handlePresetChange}
            isSmall
          />
        </div>

        {/* Fechas personalizadas condicionales */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-28 sm:w-32">
              <CustomDatePicker
                value={startDate}
                onChange={(newDate) => setStartDate(newDate)}
                placeholder={t('transactions.from', {}, language === 'es' ? 'Desde' : 'From')}
                isSmall
              />
            </div>
            <span className="text-slate-500 text-xs font-bold">—</span>
            <div className="w-28 sm:w-32">
              <CustomDatePicker
                value={endDate}
                onChange={(newDate) => setEndDate(newDate)}
                placeholder={t('transactions.to', {}, language === 'es' ? 'Hasta' : 'To')}
                isSmall
              />
            </div>
          </div>
        )}

        {/* 3. Cuentas Afectadas (Multi-select) */}
        <div className="w-[140px] sm:w-[160px] shrink-0">
          <CustomSelect
            isMulti
            options={accountOptions}
            value={selectedAccountIds}
            onChange={setSelectedAccountIds}
            placeholder={t('transactions.accountsPlaceholder', {}, language === 'es' ? 'Cuentas' : 'Accounts')}
            allLabel={t('transactions.allAccounts', {}, language === 'es' ? 'Todas las cuentas' : 'All Accounts')}
            isSmall
          />
        </div>

        {/* 4. Categorías (Multi-select) */}
        <div className="w-[140px] sm:w-[160px] shrink-0">
          <CustomSelect
            isMulti
            options={categoryOptions}
            value={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            placeholder={t('transactions.categoriesPlaceholder', {}, language === 'es' ? 'Categorías' : 'Categories')}
            allLabel={t('transactions.allCategories', {}, language === 'es' ? 'Todas las categorías' : 'All Categories')}
            isSmall
          />
        </div>

        {/* 5. Divisa */}
        <div className="w-[110px] sm:w-[125px] shrink-0">
          <CustomSelect
            options={currencyOptions}
            value={currencyFilter}
            onChange={setCurrencyFilter}
            isSmall
          />
        </div>

        {/* 6. Barra de Búsqueda */}
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('transactions.searchPlaceholder', {}, language === 'es' ? 'Buscar transacciones...' : 'Search transactions...')}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#121721] border border-white/10 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors"
          />
        </div>

        {/* 7. Limpiar Filtros */}
        {isFilterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-white/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
            title={t('transactions.clearFilters', {}, language === 'es' ? 'Limpiar filtros' : 'Clear filters')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('common.clear', {}, language === 'es' ? 'Limpiar' : 'Clear')}</span>
          </button>
        )}
      </div>      {/* Structured High-Density Feed */}
      <div className="w-full space-y-6 relative z-10">
        {sortedDates.length === 0 ? (
          safeTxList.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={t('transactions.noTxTitle', {}, 'No tienes transacciones registradas')}
              description={t('transactions.noTxDesc', {}, 'Tus movimientos aparecerán aquí conforme los vayas registrando.')}
              actionLabel={t('dashboard.registerMovement', {}, 'Registrar Movimiento')}
              actionIcon={Plus}
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <EmptyState
              icon={Search}
              title={t('common.noResultsTitle', {}, 'No se encontraron resultados')}
              description={t('common.noResultsDesc', {}, 'Prueba ajustando los filtros o el término de búsqueda.')}
              actionLabel={t('common.clearFilters', {}, 'Limpiar filtros')}
              onAction={resetFilters}
            />
          )
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
                    const destAccId = tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id;
                    const destAcc = safeAccountsList.find(a => a?.id === destAccId);
                    const cat = safeCategoriesList.find(c => c?.id === (tx?.categoryId || tx?.category_id));

                    const isIncome = tx?.type === 'income';
                    const isExpense = tx?.type === 'expense';
                    const isTransfer = tx?.type === 'transfer';

                    const isLoanTransfer = isTransfer && (!destAccId || Boolean(tx?.debtId || tx?.debt_id || /(pr[eé]stamo|loan)/i.test(tx?.description || '')));
                    const virtualAccountName = t('debts.virtual_account_name', {}, isEs ? 'Saldos Pendientes (Por Cobrar)' : 'Pending Balances (Receivable)');

                    const sourceAccName = sourceAcc?.name || t('transactions.accountFilter', {}, isEs ? 'Cuenta' : 'Account');
                    const destAccName = destAcc?.name || (isLoanTransfer ? virtualAccountName : '');
                    const catName = cat?.name || t('transactions.categoryFilter', {}, isEs ? 'General' : 'General');

                    const emoji = isTransfer ? (isLoanTransfer ? '⏳' : '🔁') : (cat?.emoji || '💰');

                    const rawDescription = tx?.description || catName || t('transactions.movement', {}, isEs ? 'Movimiento' : 'Transaction');
                    const localizedDesc = formatLoanDescription(rawDescription, isEs);
                    const txTitle = isLoanTransfer 
                      ? localizedDesc 
                      : (isTransfer && destAccName ? `${sourceAccName} ➔ ${destAccName}` : localizedDesc);

                    const displayDate = tx?.date || tx?.transactionDate || tx?.transaction_date || dateStr;

                    return (
                      <div
                        key={tx?.id || Math.random()}
                        onClick={() => {
                          setTxToEdit(tx);
                          setIsModalOpen(true);
                        }}
                        className="p-3.5 sm:px-5 sm:py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-all group cursor-pointer"
                      >
                        {/* Col 1 (Izquierda): Icono + Concepto */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden ${
                            isIncome ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border border-[var(--accent,#97F2CC)]/20' : isExpense ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          }`}>
                            <DynamicIcon value={emoji} fallback="💰" className="w-5 h-5 text-lg" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="line-clamp-2 sm:truncate text-sm font-semibold text-white group-hover:text-slate-200 transition-colors">
                              {txTitle}
                            </h4>
                            <p className="text-xs text-slate-300 font-medium sm:hidden truncate mt-0.5">
                              {isTransfer 
                                ? (isLoanTransfer
                                    ? `${sourceAccName} ➔ ⏳ ${virtualAccountName}`
                                    : `${sourceAccName} ➔ ${destAccName || ''}`)
                                : `${sourceAccName} • ${catName}`}
                            </p>
                          </div>
                        </div>

                        {/* Col 2 (Centro-Izquierda): Badge de Cuenta y Categoría (Desktop) */}
                        <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]" title={sourceAccName}>
                            🏦 {sourceAccName}
                          </span>
                          {isTransfer ? (
                            destAcc ? (
                              <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]" title={destAcc.name}>
                                ➔ 🏦 {destAcc.name}
                              </span>
                            ) : isLoanTransfer ? (
                              <span 
                                className="text-slate-400 bg-slate-800/40 border border-slate-700/40 rounded px-2 py-0.5 text-xs truncate max-w-[190px] inline-flex items-center gap-1.5 shrink-0"
                                title={virtualAccountName}
                              >
                                ➔ <span>⏳</span> <span className="truncate">{virtualAccountName}</span>
                              </span>
                            ) : null
                          ) : (
                            <span className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]">
                              🏷️ {catName}
                            </span>
                          )}
                        </div>

                        {/* Col 3 (Centro-Derecha): Fecha legible (Desktop) */}
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0 w-28">
                          <span>🕒 {displayDate}</span>
                        </div>

                        {/* Col 4 (Derecha): Monto formateado grande + Botones en hover */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`text-base font-bold tabular-nums ${isIncome ? 'text-[var(--accent,#97F2CC)]' : isExpense ? 'text-rose-400' : 'text-sky-400'}`}>
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
        pageSizeOptions={[30, 50, 100]}
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
