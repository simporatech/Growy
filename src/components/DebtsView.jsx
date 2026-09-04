import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Percent, Trash2, CheckCircle, Search, 
  ArrowDownLeft, ArrowUpRight, History, ChevronDown, 
  ChevronUp, Wallet, Calendar, AlertCircle, Edit3, DollarSign, Clock, Users,
  RotateCcw
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import EmptyState from './common/EmptyState';
import DebtModal from './DebtModal';
import ReceivableModal from './debts/ReceivableModal';
import DebtPaymentModal from './DebtPaymentModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import Pagination from './Pagination';
import DynamicIcon from './DynamicIcon';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric, getDaysDifference, formatDateISO } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';
import { calculateDebtRemaining } from '../services/debtsService';

/**
 * DebtsView (Módulo de Saldos Pendientes: Por Pagar, Por Cobrar y Gestión de Abonos)
 * Alineado al Design System y jerarquía visual estándar de Growy (Categorías / Cuentas).
 */
export default function DebtsView() {
  const { 
    loans, 
    debtPayments, 
    categories, 
    accounts, 
    addLoan, 
    updateLoan, 
    deleteLoan, 
    addDebtPayment, 
    deleteDebtPayment 
  } = useFinance();

  const { formatCurrency, language, t, baseCurrency, exchangeRates } = useSettings();

  // Modals state
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState(null);
  const [debtToDelete, setDebtToDelete] = useState(null);
  const [debtToPay, setDebtToPay] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Tab Filter: 'payable' | 'receivable' | 'completed'
  const [activeTab, setActiveTab] = useState('payable');
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Filter states
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded History Cards state (Set of debt IDs)
  const [expandedHistories, setExpandedHistories] = useState(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const safeLoansList = useMemo(() => Array.isArray(loans) ? loans.filter(Boolean) : [], [loans]);
  const safePaymentsList = useMemo(() => Array.isArray(debtPayments) ? debtPayments.filter(Boolean) : [], [debtPayments]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);

  // Date Preset handler
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
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        setStartDate(formatDateISO(start));
        setEndDate(formatDateISO(end));
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

  const datePresetOptions = useMemo(() => [
    { value: 'all', label: t('transactions.presets.allHistory', {}, isEs ? 'Todo el Historial' : 'All History') },
    { value: 'this_month', label: t('transactions.presets.thisMonth', {}, isEs ? 'Este Mes' : 'This Month') },
    { value: 'last_month', label: t('transactions.presets.lastMonth', {}, isEs ? 'Mes Anterior' : 'Last Month') },
    { value: 'last_30_days', label: t('transactions.presets.last30Days', {}, isEs ? 'Últimos 30 Días' : 'Last 30 Days') },
    { value: 'this_year', label: t('transactions.presets.thisYear', {}, isEs ? 'Este Año' : 'This Year') },
    { value: 'custom', label: t('transactions.presets.custom', {}, isEs ? 'Personalizado' : 'Custom Range') }
  ], [t, isEs]);

  // Category Filter Options (Sorted with Logos)
  const categoryFilterOptions = useMemo(() => [
    ...[...safeCategoriesList]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
      .map(cat => ({
        value: cat.id,
        label: cat.name,
        name: cat.name,
        emoji: cat.emoji || '🏷️'
      }))
  ], [safeCategoriesList]);

  // Currency Filter Options
  const currencyOptions = useMemo(() => {
    const set = new Set(safeLoansList.map(l => l.currency || baseCurrency));
    if (baseCurrency) set.add(baseCurrency);
    return [
      { value: 'all', label: t('common.allCurrencies', {}, isEs ? 'Todas las divisas' : 'All Currencies'), emoji: '🌐' },
      ...Array.from(set).map(c => ({
        value: c,
        label: c,
        name: c,
        emoji: '💱'
      }))
    ];
  }, [safeLoansList, baseCurrency, t, isEs]);

  const hasActiveFilters = Boolean(
    selectedCategoryIds.length > 0 || 
    currencyFilter !== 'all' || 
    datePreset !== 'all' || 
    startDate || 
    endDate || 
    searchTerm.trim()
  );

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategoryIds([]);
    setCurrencyFilter('all');
    handlePresetChange('all');
  }, [handlePresetChange]);

  // Enrich each loan with its calculated remaining balance, total paid, and settlement status
  const enrichedDebts = useMemo(() => {
    return safeLoansList.map(loan => {
      const calc = calculateDebtRemaining(loan, safePaymentsList);
      const isPayable = (loan.type || '').toLowerCase() !== 'receivable';
      return {
        ...loan,
        calc,
        isPayable
      };
    });
  }, [safeLoansList, safePaymentsList]);

  // Filter enriched debts by search, tab, category, currency, and date range
  const filteredDebts = useMemo(() => {
    return enrichedDebts.filter(d => {
      if (!d) return false;
      const isSettled = d.calc.isSettled || d.status === 'settled' || d.status === 'paid';

      // 1. Tab filter (payable / receivable / completed)
      if (activeTab === 'payable' && (!d.isPayable || isSettled)) return false;
      if (activeTab === 'receivable' && (d.isPayable || isSettled)) return false;
      if (activeTab === 'completed' && !isSettled) return false;

      // 2. Text search query (concept includes search term)
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const conceptText = String(d.concept || d.description || '').toLowerCase();
        if (!conceptText.includes(q)) return false;
      }

      // 3. Category filter (Multi-select)
      if (selectedCategoryIds.length > 0) {
        const catId = d.categoryId || d.category_id;
        if (!selectedCategoryIds.includes(catId)) return false;
      }

      // 4. Currency filter
      if (currencyFilter !== 'all') {
        const debtCurrency = d.currency || 'USD';
        if (debtCurrency !== currencyFilter) return false;
      }

      // 5. Date Range Filter (due_date or start_date between startDate and endDate)
      const dDateRaw = d.dueDate || d.due_date || d.startDate || d.start_date || d.createdAt || d.created_at || '';
      const dDate = dDateRaw ? (dDateRaw.includes('T') ? dDateRaw.split('T')[0] : dDateRaw) : '';
      if (startDate && dDate && dDate < startDate) return false;
      if (endDate && dDate && dDate > endDate) return false;

      return true;
    });
  }, [enrichedDebts, activeTab, searchTerm, selectedCategoryIds, currencyFilter, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedCategoryIds, currencyFilter, startDate, endDate]);

  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDebts.slice(start, start + pageSize);
  }, [filteredDebts, currentPage, pageSize]);

  const isEs = language === 'es';

  // Dynamic Action Label based on active tab:
  // - payable: 'Nueva Deuda' / 'New Debt'
  // - receivable: 'Nuevo Préstamo' / 'New Loan'
  // - completed: 'Nueva Deuda' / 'New Debt'
  const activeActionLabel = useMemo(() => {
    if (activeTab === 'receivable') {
      return t('debts.actions.new_loan', {}, isEs ? 'Nuevo Préstamo' : 'New Loan');
    }
    return t('debts.actions.new_debt', {}, isEs ? 'Nueva Deuda' : 'New Debt');
  }, [activeTab, isEs, t]);

  // Toggle History Accordion for a card
  const toggleHistory = (debtId, e) => {
    if (e) e.stopPropagation();
    setExpandedHistories(prev => {
      const next = new Set(prev);
      if (next.has(debtId)) {
        next.delete(debtId);
      } else {
        next.add(debtId);
      }
      return next;
    });
  };

  // --- STATS DEDICADAS POR PESTAÑA ---
  const tabStats = useMemo(() => {
    let totalPayableRemaining = 0;
    let totalPayableOriginal = 0;
    let totalPayablePaid = 0;
    let earliestPayableDue = null;

    let totalReceivableRemaining = 0;
    let totalReceivableOriginal = 0;
    let totalReceivablePaid = 0;
    let activeReceivableCount = 0;

    let totalSettledAmount = 0;
    let totalSettledCount = 0;

    enrichedDebts.forEach(d => {
      const origConverted = convertCrossCurrency(d.calc.originalAmount, d.currency || 'USD', baseCurrency, exchangeRates);
      const paidConverted = convertCrossCurrency(d.calc.totalPaid, d.currency || 'USD', baseCurrency, exchangeRates);
      const remConverted = convertCrossCurrency(d.calc.remainingAmount, d.currency || 'USD', baseCurrency, exchangeRates);

      if (d.calc.isSettled) {
        totalSettledAmount += origConverted;
        totalSettledCount++;
        return;
      }

      if (d.isPayable) {
        totalPayableRemaining += remConverted;
        totalPayableOriginal += origConverted;
        totalPayablePaid += paidConverted;

        if (d.dueDate) {
          if (!earliestPayableDue || new Date(d.dueDate) < new Date(earliestPayableDue)) {
            earliestPayableDue = d.dueDate;
          }
        }
      } else {
        totalReceivableRemaining += remConverted;
        totalReceivableOriginal += origConverted;
        totalReceivablePaid += paidConverted;
        activeReceivableCount++;
      }
    });

    const payableProgress = totalPayableOriginal > 0 ? Math.min(100, Math.round((totalPayablePaid / totalPayableOriginal) * 100)) : 0;
    const receivableProgress = totalReceivableOriginal > 0 ? Math.min(100, Math.round((totalReceivablePaid / totalReceivableOriginal) * 100)) : 0;
    const netCommitments = totalReceivableRemaining - totalPayableRemaining;

    let payableDueLabel = isEs ? 'Próximo vencimiento: Al día / Sin fecha' : 'Next due date: Up to date / No date';
    let payableDueClass = 'text-slate-300';

    if (earliestPayableDue) {
      const diff = getDaysDifference(earliestPayableDue);
      if (diff < 0) {
        payableDueLabel = isEs ? `Próximo vencimiento: ¡Vencido hace ${Math.abs(diff)}d! (${earliestPayableDue})` : `Next due date: Overdue by ${Math.abs(diff)}d! (${earliestPayableDue})`;
        payableDueClass = 'text-rose-400 font-bold';
      } else if (diff === 0) {
        payableDueLabel = isEs ? `Próximo vencimiento: ¡Vence hoy! (${earliestPayableDue})` : `Next due date: Due today! (${earliestPayableDue})`;
        payableDueClass = 'text-amber-400 font-bold';
      } else {
        payableDueLabel = t('debts.next_due_date', { days: diff, date: earliestPayableDue }, isEs ? `Próximo vencimiento: En ${diff} días (${earliestPayableDue})` : `Next due date: In ${diff} days (${earliestPayableDue})`);
        payableDueClass = 'text-slate-200 font-medium';
      }
    }

    return {
      totalPayableRemaining,
      totalPayableOriginal,
      totalPayablePaid,
      payableProgress,
      payableDueLabel,
      payableDueClass,
      totalReceivableRemaining,
      totalReceivableOriginal,
      totalReceivablePaid,
      receivableProgress,
      activeReceivableCount,
      totalSettledAmount,
      totalSettledCount,
      netCommitments
    };
  }, [enrichedDebts, baseCurrency, exchangeRates, isEs, t]);

  const debtColumns = useMemo(() => [
    { 
      label: isEs ? 'Concepto' : 'Concept', 
      accessor: (l) => (l?.concept || l?.description || '-') 
    },
    { 
      label: isEs ? 'Tipo' : 'Type', 
      accessor: (l) => l?.isPayable ? (isEs ? 'Por Pagar' : 'Payable') : (isEs ? 'Por Cobrar' : 'Receivable') 
    },
    { 
      label: t('debts.card.original', {}, isEs ? 'Monto Original' : 'Original Amount'), 
      accessor: (l) => parseNumeric(l?.amount, 0).toFixed(2) 
    },
    { 
      label: t('debts.card.paid', {}, isEs ? 'Total Abonado' : 'Total Paid'), 
      accessor: (l) => (l?.calc?.totalPaid || 0).toFixed(2) 
    },
    { 
      label: t('debts.card.remaining', {}, isEs ? 'Saldo Restante' : 'Remaining Balance'), 
      accessor: (l) => (l?.calc?.remainingAmount || 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Moneda' : 'Currency', 
      accessor: (l) => l?.currency || 'USD' 
    },
    { 
      label: isEs ? 'Fecha Vencimiento' : 'Due Date', 
      accessor: (l) => (l?.dueDate || l?.due_date || 'N/A') 
    },
    { 
      label: isEs ? 'Estado' : 'Status', 
      accessor: (l) => l?.calc?.isSettled ? (isEs ? 'Liquidado' : 'Settled') : (isEs ? 'Pendiente' : 'Pending') 
    }
  ], [isEs, t]);

  const debtSummary = useMemo(() => ({
    totalRecords: filteredDebts.length,
    consolidatedTotal: activeTab === 'payable'
      ? `${formatCurrency(tabStats.totalPayableRemaining, baseCurrency)} (Por Pagar)`
      : activeTab === 'receivable'
        ? `${formatCurrency(tabStats.totalReceivableRemaining, baseCurrency)} (Por Cobrar)`
        : `${formatCurrency(tabStats.totalSettledAmount, baseCurrency)} (Completados)`,
    baseCurrency
  }), [filteredDebts.length, activeTab, tabStats, baseCurrency, formatCurrency]);

  const exportFilename = isEs ? 'Growy_Saldos_Pendientes' : 'Growy_Pending_Debts';

  return (
    <div 
      className="w-full space-y-6 animate-fadeIn pb-32 md:pb-6"
    >
      
      {/* 1. STANDARDIZED HEADER (Idéntico a Categorías y Cuentas) */}
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('debts.title', {}, 'Saldos Pendientes')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('debts.subtitle', {}, 'Controla deudas pendientes, préstamos otorgados y compromisos financieros')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown
            data={filteredDebts}
            columns={debtColumns}
            title={t('debts.exportTitle', {}, 'Reporte de Saldos Pendientes')}
            filename={exportFilename}
            summary={debtSummary}
          />

          <button
            type="button"
            onClick={() => {
              setDebtToEdit(null);
              if (activeTab === 'receivable') {
                setIsReceivableModalOpen(true);
              } else {
                setIsDebtModalOpen(true);
              }
            }}
            className="bg-[var(--accent)] text-black font-semibold h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title={activeActionLabel}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{activeActionLabel}</span>
          </button>
        </div>
      </header>

      {/* 2. TOOLBAR: UNIFIED CARBON-GRAY FILTER BAR */}
      <div className="w-full bg-[#0D1117]/90 border border-white/10 rounded-2xl p-3 gap-2.5 sm:gap-3 flex flex-wrap items-center relative z-20 backdrop-blur-xl shadow-lg">
        {/* 1. Período */}
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
                placeholder={t('debts.date_from', {}, isEs ? 'Desde' : 'From')}
                isSmall
              />
            </div>
            <span className="text-slate-500 text-xs font-bold">—</span>
            <div className="w-28 sm:w-32">
              <CustomDatePicker
                value={endDate}
                onChange={(newDate) => setEndDate(newDate)}
                placeholder={t('debts.date_to', {}, isEs ? 'Hasta' : 'To')}
                isSmall
              />
            </div>
          </div>
        )}

        {/* 2. Categorías (Multi-select) */}
        <div className="w-[140px] sm:w-[160px] shrink-0">
          <CustomSelect
            isMulti
            options={categoryFilterOptions}
            value={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            placeholder={t('debts.categoriesPlaceholder', {}, isEs ? 'Categorías' : 'Categories')}
            allLabel={t('debts.all_categories', {}, isEs ? 'Todas las categorías' : 'All Categories')}
            isSmall
          />
        </div>

        {/* 3. Divisa */}
        <div className="w-[110px] sm:w-[125px] shrink-0">
          <CustomSelect
            options={currencyOptions}
            value={currencyFilter}
            onChange={setCurrencyFilter}
            isSmall
          />
        </div>

        {/* 4. Barra de Búsqueda */}
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('debts.search_placeholder', {}, isEs ? 'Buscar por concepto...' : 'Search by concept...')}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#121721] border border-white/10 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors"
          />
        </div>

        {/* 5. Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-white/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
            title={t('debts.clear_filters', {}, isEs ? 'Limpiar filtros' : 'Clear filters')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('common.clear', {}, isEs ? 'Limpiar' : 'Clear')}</span>
          </button>
        )}
      </div>

      {/* 3. HERO BANNER: DEDICATED STATS CARDS BY TAB */}
      <div className="w-full p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl bg-[#0D1117]/80 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative z-10 transition-colors duration-150">
        
        {activeTab === 'payable' ? (
          /* MODO A: POR PAGAR (DEUDAS PROPIAS) */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Total Pendiente de Pago */}
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
                  {t('debts.total_payable', {}, 'TOTAL POR PAGAR (DEUDAS)')}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
                    {formatCurrency(tabStats.totalPayableRemaining, baseCurrency)}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-slate-400">
                    / {formatCurrency(tabStats.totalPayableOriginal, baseCurrency)}
                  </span>
                </div>
              </div>

              {/* Total Abonado hasta hoy */}
              <div className="lg:col-span-3">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.total_paid', {}, 'TOTAL ABONADO')}
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block text-emerald-400">
                  {formatCurrency(tabStats.totalPayablePaid, baseCurrency)}
                </span>
              </div>

              {/* Próximo Vencimiento y Progreso */}
              <div className="lg:col-span-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('debts.settlement_progress', {}, 'PROGRESO DE LIQUIDACIÓN')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {tabStats.payableProgress}%
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2.5 sm:h-3 p-0.5 border border-white/10 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${tabStats.payableProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <span className={tabStats.payableDueClass}>{tabStats.payableDueLabel}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.payable_desc', {}, 'Saldos pendientes que debes pagar a bancos, tarjetas o personas.')}</span>
              <span className="font-bold text-white tabular-nums">
                {filteredDebts.length === 1 
                  ? t('debts.active_debts', { count: filteredDebts.length }, '1 deuda activa') 
                  : t('debts.active_debts_plural', { count: filteredDebts.length }, `${filteredDebts.length} deudas activas`)}
              </span>
            </div>
          </>
        ) : activeTab === 'receivable' ? (
          /* MODO B: POR COBRAR (PRÉSTAMOS Y COBROS A MI FAVOR) */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Total Por Recuperar */}
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                  {t('debts.totalReceivableLabel', {}, 'TOTAL POR RECUPERAR (A MI FAVOR)')}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
                    {formatCurrency(tabStats.totalReceivableRemaining, baseCurrency)}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-slate-400">
                    / {formatCurrency(tabStats.totalReceivableOriginal, baseCurrency)}
                  </span>
                </div>
              </div>

              {/* Total Cobrado / Recuperado */}
              <div className="lg:col-span-3">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.totalCollected', {}, 'Total Cobrado / Recuperado')}
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block text-emerald-400">
                  {formatCurrency(tabStats.totalReceivablePaid, baseCurrency)}
                </span>
              </div>

              {/* Personas / Deudores Activos & Barra */}
              <div className="lg:col-span-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('debts.collectionProgress', {}, 'Tasa de recuperación')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {tabStats.receivableProgress}%
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2.5 sm:h-3 p-0.5 border border-white/10 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[var(--accent,#97F2CC)] to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${tabStats.receivableProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong className="text-white">{tabStats.activeReceivableCount}</strong> {t('debts.activeDebtors', {}, 'personas o cuentas con saldo pendiente')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.receivable_desc', {}, 'Dinero prestado o cobros pendientes que ingresarán a tus cuentas.')}</span>
              <span className="font-bold text-emerald-400 tabular-nums">{filteredDebts.length} {t('debts.activeCollections', {}, 'cobros activos')}</span>
            </div>
          </>
        ) : (
          /* MODO C: COMPLETADOS / LIQUIDADOS */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                  {t('debts.totalSettledLabel', {}, 'TOTAL SALDADO Y LIQUIDADO')}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight mt-1 block">
                  {formatCurrency(tabStats.totalSettledAmount, baseCurrency)}
                </span>
              </div>

              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.completedCommitments', {}, 'Compromisos Finalizados')}
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block text-emerald-400">
                  {tabStats.totalSettledCount} {t('debts.settledCountBadge', {}, 'liquidados')}
                </span>
              </div>

              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.netBalanceLabel', {}, 'Balance Neto Global')}
                </span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block ${
                  tabStats.netCommitments >= 0 ? 'text-[var(--accent,#97F2CC)]' : 'text-rose-400'
                }`}>
                  {tabStats.netCommitments >= 0 ? '+ ' : ''}
                  {formatCurrency(tabStats.netCommitments, baseCurrency)}
                </span>
              </div>
            </div>

            <div className="pt-3.5 sm:pt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.settledFooterHelp', {}, 'Historial de saldos saldados al 100% y cerrados exitosamente.')}</span>
              <span className="font-bold text-emerald-400 tabular-nums">{filteredDebts.length} {t('debts.settledRecords', {}, 'registros completados')}</span>
            </div>
          </>
        )}
      </div>

      {/* 4. SEGMENTED TAB FILTER (Idéntico a Categorías) */}
      <div className="flex items-center justify-between gap-3 relative z-10 w-full">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          
          <button
            type="button"
            onClick={() => setActiveTab('payable')}
            className={`flex-1 sm:flex-initial h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payable'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{t('debts.tabs.payable', {}, 'Por Pagar (Deudas)')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receivable')}
            className={`flex-1 sm:flex-initial h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'receivable'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t('debts.tabs.receivable', {}, 'Por Cobrar (Préstamos)')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial h-11 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border border-[var(--accent,#97F2CC)]/30 shadow-sm'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)] shrink-0" />
            <span>{t('debts.tabs.completed', {}, 'Completados')}</span>
          </button>

        </div>
      </div>

      {/* 5. CARDS LIST CONTAINER */}
      {paginatedDebts.length === 0 ? (
        <EmptyState
          icon={Percent}
          title={t('debts.noDebtsFound', {}, 'No hay compromisos en esta sección')}
          description={t('debts.noDebtsFoundSub', {}, 'Puedes crear un nuevo saldo por pagar o por cobrar.')}
          actionLabel={activeActionLabel}
          actionIcon={Plus}
          onAction={() => {
            setDebtToEdit(null);
            if (activeTab === 'receivable') {
              setIsReceivableModalOpen(true);
            } else {
              setIsDebtModalOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedDebts.map(debt => {
            const catId = debt.categoryId || debt.category_id;
            const catObj = safeCategoriesList.find(c => c && c.id === catId);
            const isSettled = debt.calc.isSettled;
            const isExpanded = expandedHistories.has(debt.id);

            // Payments belonging to this debt
            const associatedPayments = safePaymentsList.filter(p => {
              const pDebtId = p.debtId !== undefined ? p.debtId : p.debt_id;
              return String(pDebtId) === String(debt.id);
            });

            // Urgency due date calculation
            let urgencyLabel = '';
            let urgencyColor = 'text-slate-400 bg-white/5 border-white/10';
            if (debt.dueDate && !isSettled) {
              const daysDiff = getDaysDifference(debt.dueDate);
              const duePrefix = t('debts.card.due_prefix', {}, isEs ? 'Vence' : 'Due');
              if (daysDiff < 0) {
                urgencyLabel = isEs ? `Vencido hace ${Math.abs(daysDiff)} días` : `Overdue by ${Math.abs(daysDiff)} days`;
                urgencyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold';
              } else if (daysDiff === 0) {
                urgencyLabel = isEs ? 'Vence hoy' : 'Due today';
                urgencyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold';
              } else if (daysDiff <= 3) {
                urgencyLabel = isEs ? `${duePrefix} en ${daysDiff} días` : `${duePrefix} in ${daysDiff} days`;
                urgencyColor = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
              } else {
                urgencyLabel = `${duePrefix} ${debt.dueDate}`;
              }
            }

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-2xl bg-[#0D1117]/80 border transition-colors duration-150 flex flex-col justify-between gap-4 shadow-lg ${
                  isSettled 
                    ? 'border-emerald-500/20 opacity-80' 
                    : debt.isPayable 
                      ? 'border-white/10 hover:border-rose-500/30' 
                      : 'border-white/10 hover:border-emerald-500/30'
                }`}
              >
                
                {/* Header: Type Badge + Icon + Concept + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                      debt.isPayable 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' 
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    }`}>
                      <DynamicIcon 
                        value={debt.emoji || debt.icon || catObj?.emoji || (!debt.isPayable ? '👤' : '💳')} 
                        fallback={!debt.isPayable ? '👤' : '💳'} 
                        className="w-5 h-5 text-lg" 
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          debt.isPayable 
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${debt.isPayable ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                          <span>{debt.isPayable ? t('debts.card.payable_badge', {}, 'POR PAGAR') : t('debts.card.receivable_badge', {}, 'POR COBRAR')}</span>
                        </span>
                        {catObj?.name && (
                          <span className="text-[11px] text-slate-400 truncate">
                            • {catObj.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white truncate mt-1">
                        {debt.concept || debt.description || 'Sin concepto'}
                      </h4>
                    </div>
                  </div>

                  {/* Actions: Edit / Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDebtToEdit(debt);
                        if (!debt.isPayable) {
                          setIsReceivableModalOpen(true);
                        } else {
                          setIsDebtModalOpen(true);
                        }
                      }}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={t('common.edit', {}, 'Editar')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDebtToDelete(debt)}
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      title={t('common.delete', {}, 'Eliminar')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amounts Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/30 border border-white/5 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">{t('debts.card.original', {}, 'ORIGINAL')}</span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {formatCurrency(debt.calc.originalAmount, debt.currency || 'USD')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">{t('debts.card.paid', {}, 'ABONADO')}</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(debt.calc.totalPaid, debt.currency || 'USD')}
                    </span>
                  </div>

                  <div>
                    <span className={`text-[10px] uppercase font-bold block ${debt.isPayable ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t('debts.card.remaining', {}, 'RESTANTE')}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      isSettled ? 'text-slate-400 line-through' : debt.isPayable ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {formatCurrency(debt.calc.remainingAmount, debt.currency || 'USD')}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <span className="text-slate-400 font-medium">
                      {formatCurrency(debt.calc.totalPaid, debt.currency || 'USD')} / {formatCurrency(debt.calc.originalAmount, debt.currency || 'USD')} ({debt.calc.progressPercentage}%)
                    </span>
                    {urgencyLabel && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${urgencyColor}`}>
                        {urgencyLabel}
                      </span>
                    )}
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSettled 
                          ? 'bg-emerald-400' 
                          : debt.isPayable 
                            ? 'bg-rose-400' 
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${debt.calc.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer Buttons: Abonar + Historial */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleHistory(debt.id, e)}
                    className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="whitespace-nowrap">{t('debts.card.payments_count', { count: associatedPayments.length }, `Abonos (${associatedPayments.length})`)}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                  </button>

                  {!isSettled ? (
                    <button
                      type="button"
                      onClick={() => setDebtToPay(debt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors whitespace-nowrap border border-[var(--accent)]/30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('debts.make_payment')}</span>
                    </button>
                  ) : (
                    <div className="whitespace-nowrap flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('debts.settledBadge', {}, 'Liquidado')}</span>
                    </div>
                  )}
                </div>

                {/* Accordion: Payments History List */}
                {isExpanded && (
                  <div className="mt-2 pt-3 border-t border-white/10 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>{t('debts.historyTitle', {}, 'Historial de Abonos Registrados')}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {associatedPayments.length} {t('debts.records', {}, 'registros')}
                      </span>
                    </div>

                    {associatedPayments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center">
                        {t('debts.noPaymentsYet', {}, 'Aún no hay abonos registrados para este saldo')}
                      </p>
                    ) : (
                      <div className="space-y-1.5 h-auto overflow-visible pr-1">
                        {associatedPayments.map(payment => {
                          const accId = payment.accountId || payment.account_id;
                          const accObj = safeAccountsList.find(a => a && a.id === accId);

                          return (
                            <div
                              key={payment.id}
                              className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white tabular-nums">
                                    {formatCurrency(payment.amount, debt.currency || 'USD')}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                                    <span>🕒 {payment.paymentDate || payment.payment_date || '-'}</span>
                                    {accObj && (
                                      <span>• 🏦 {accObj.name}</span>
                                    )}
                                  </div>
                                  {payment.notes && (
                                    <p className="text-[10px] text-slate-400 italic truncate mt-0.5">
                                      "{payment.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setPaymentToDelete(payment)}
                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                title={t('debts.deletePaymentTitle', {}, 'Eliminar abono y revertir transacción')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* 6. PAGINATION */}
      {filteredDebts.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredDebts.length}
          pageSize={pageSize}
          pageSizeOptions={[30, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* 7. MODALS */}
      {/* DebtModal (Crear / Editar Deudas por Pagar) */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
        initialType="payable"
        categories={safeCategoriesList}
        accounts={safeAccountsList}
        onSave={(data) => {
          if (debtToEdit) {
            updateLoan(data);
          } else {
            addLoan(data);
          }
        }}
      />

      {/* ReceivableModal (Crear / Editar Saldos por Cobrar y Préstamos Otorgados) */}
      <ReceivableModal
        isOpen={isReceivableModalOpen}
        onClose={() => {
          setIsReceivableModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
        accounts={safeAccountsList}
        onSave={(data) => {
          if (debtToEdit) {
            updateLoan(data);
          } else {
            addLoan(data);
          }
        }}
      />

      {/* DebtPaymentModal (Abonar) */}
      <DebtPaymentModal
        isOpen={Boolean(debtToPay)}
        onClose={() => setDebtToPay(null)}
        debt={debtToPay}
        payments={safePaymentsList}
        accounts={safeAccountsList}
        onConfirmPayment={async (params) => {
          await addDebtPayment(params);
          setDebtToPay(null);
        }}
      />

      {/* Confirm Delete Debt Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(debtToDelete)}
        onClose={() => setDebtToDelete(null)}
        onConfirm={() => {
          if (debtToDelete) {
            deleteLoan(debtToDelete.id);
            setDebtToDelete(null);
          }
        }}
        title={t('debts.deleteModalTitle', {}, 'Eliminar Saldo Pendiente')}
        description={t('debts.deleteModalDesc', { name: debtToDelete?.concept || debtToDelete?.description || 'este saldo' }, `¿Estás seguro de eliminar "${debtToDelete?.concept || debtToDelete?.description}"? Esta acción no se puede deshacer.`)}
      />

      {/* Confirm Delete Payment Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={async () => {
          if (paymentToDelete) {
            await deleteDebtPayment(paymentToDelete.id, paymentToDelete);
            setPaymentToDelete(null);
          }
        }}
        title={t('debts.deletePaymentModalTitle', {}, 'Eliminar Abono')}
        description={t('debts.deletePaymentModalDesc', {}, '¿Estás seguro de eliminar este abono? El saldo de la cuenta bancaria involucrada y el balance restante de la deuda se restaurarán automáticamente.')}
      />

    </div>
  );
}
