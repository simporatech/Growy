import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Percent, Trash2, CheckCircle, Search, 
  ArrowDownLeft, ArrowUpRight, History, ChevronDown, 
  ChevronUp, Wallet, Calendar, AlertCircle, Edit3, DollarSign, Clock, Users
} from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';
import DebtModal from './DebtModal';
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
  const [debtToEdit, setDebtToEdit] = useState(null);
  const [debtToDelete, setDebtToDelete] = useState(null);
  const [debtToPay, setDebtToPay] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Tab Filter: 'payable' | 'receivable' | 'completed'
  const [activeTab, setActiveTab] = useState('payable');
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded History Cards state (Set of debt IDs)
  const [expandedHistories, setExpandedHistories] = useState(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeLoansList = useMemo(() => Array.isArray(loans) ? loans.filter(Boolean) : [], [loans]);
  const safePaymentsList = useMemo(() => Array.isArray(debtPayments) ? debtPayments.filter(Boolean) : [], [debtPayments]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);

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

  // Filter enriched debts by search and tab filter
  const filteredDebts = useMemo(() => {
    return enrichedDebts.filter(d => {
      if (!d) return false;
      const isSettled = d.calc.isSettled;

      if (activeTab === 'payable' && (!d.isPayable || isSettled)) return false;
      if (activeTab === 'receivable' && (d.isPayable || isSettled)) return false;
      if (activeTab === 'completed' && !isSettled) return false;

      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const conceptText = String(d.concept || d.description || '').toLowerCase();
        const catId = d.categoryId || d.category_id;
        const catObj = safeCategoriesList.find(c => c && c.id === catId);
        const catName = String(catObj?.name || '').toLowerCase();
        return conceptText.includes(q) || catName.includes(q);
      }
      return true;
    });
  }, [enrichedDebts, activeTab, searchTerm, safeCategoriesList]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDebts.slice(start, start + pageSize);
  }, [filteredDebts, currentPage, pageSize]);

  const isEs = language === 'es';

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

    let payableDueLabel = isEs ? 'Al día / Sin fecha' : 'Up to date / No date';
    let payableDueClass = 'text-slate-300';

    if (earliestPayableDue) {
      const diff = getDaysDifference(earliestPayableDue);
      if (diff < 0) {
        payableDueLabel = isEs ? `¡Vencido (${Math.abs(diff)}d)!` : `Overdue (${Math.abs(diff)}d)!`;
        payableDueClass = 'text-rose-400 font-bold';
      } else if (diff === 0) {
        payableDueLabel = isEs ? 'Vence hoy' : 'Due today';
        payableDueClass = 'text-amber-400 font-bold';
      } else {
        payableDueLabel = isEs ? `En ${diff} días (${earliestPayableDue})` : `In ${diff} days (${earliestPayableDue})`;
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
  }, [enrichedDebts, baseCurrency, exchangeRates, isEs]);

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
      label: isEs ? 'Monto Original' : 'Original Amount', 
      accessor: (l) => parseNumeric(l?.amount, 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Total Abonado' : 'Total Paid', 
      accessor: (l) => (l?.calc?.totalPaid || 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Saldo Restante' : 'Remaining Balance', 
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
  ], [isEs]);

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
      className="w-full min-w-full box-border debts-container space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6"
      style={{ scrollbarGutter: 'stable', boxSizing: 'border-box', width: '100%' }}
    >
      
      {/* 1. STANDARDIZED HEADER (Idéntico a Categorías y Cuentas) */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('debts.title', {}, 'Saldos Pendientes')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('debts.subtitle', {}, 'Controla deudas pendientes, préstamos otorgados y compromisos financieros')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredDebts}
              columns={debtColumns}
              title={t('debts.exportTitle', {}, 'Reporte de Saldos Pendientes')}
              filename={exportFilename}
              summary={debtSummary}
            />
          </div>

          <Button
            size="md"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setDebtToEdit(null);
              setIsDebtModalOpen(true);
            }}
            title={t('debts.newDebtBtn', {}, 'Nuevo Saldo')}
          >
            <span className="hidden sm:inline">{t('debts.newDebtBtn', {}, 'Nuevo Saldo')}</span>
          </Button>
        </div>
      </header>

      {/* 2. TOOLBAR: SEARCH AND MOBILE EXPORT */}
      <div className="flex items-center gap-2 w-full relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('debts.searchPlaceholder', {}, 'Buscar por concepto o categoría...')}
            className="w-full h-11 pl-9 pr-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[var(--accent,#97F2CC)] shadow-inner transition-colors"
          />
        </div>
        <div className="sm:hidden shrink-0">
          <ExportDropdown
            data={filteredDebts}
            columns={debtColumns}
            title={t('debts.exportTitle', {}, 'Reporte de Saldos Pendientes')}
            filename={exportFilename}
            summary={debtSummary}
          />
        </div>
      </div>

      {/* 3. HERO BANNER: DEDICATED STATS CARDS BY TAB */}
      <div className="w-full bg-[#111722]/80 border border-white/10 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-md relative z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 ease-in-out">
        
        {activeTab === 'payable' ? (
          /* MODO A: POR PAGAR (DEUDAS PROPIAS) */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Total Pendiente de Pago */}
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
                  {t('debts.totalPayableLabel', {}, 'TOTAL POR PAGAR (DEUDAS)')}
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
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.totalPaidSoFar', {}, 'Total Abonado')}
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block text-emerald-400">
                  {formatCurrency(tabStats.totalPayablePaid, baseCurrency)}
                </span>
              </div>

              {/* Próximo Vencimiento */}
              <div className="lg:col-span-4 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('debts.progress', {}, 'Progreso de liquidación')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {tabStats.payableProgress}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-rose-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${tabStats.payableProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {t('debts.nextDueDateLabel', {}, 'Próximo vencimiento:')} <span className={tabStats.payableDueClass}>{tabStats.payableDueLabel}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.payableFooterHelp', {}, 'Saldos pendientes que debes cancelar a bancos, tarjetas o personas.')}</span>
              <span className="font-bold text-white tabular-nums">{filteredDebts.length} {t('debts.activeRecords', {}, 'deudas activas')}</span>
            </div>
          </>
        ) : activeTab === 'receivable' ? (
          /* MODO B: POR COBRAR (PRÉSTAMOS Y COBROS A MI FAVOR) */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Total Por Recuperar */}
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-[var(--accent,#97F2CC)] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent,#97F2CC)] inline-block shrink-0" />
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
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('debts.totalCollected', {}, 'Total Cobrado / Recuperado')}
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block text-[var(--accent,#97F2CC)]">
                  {formatCurrency(tabStats.totalReceivablePaid, baseCurrency)}
                </span>
              </div>

              {/* Personas / Deudores Activos & Barra */}
              <div className="lg:col-span-4 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('debts.collectionProgress', {}, 'Tasa de recuperación')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {tabStats.receivableProgress}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-[var(--accent,#97F2CC)] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${tabStats.receivableProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5">
                  <Users className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)] shrink-0" />
                  <span>
                    <strong className="text-white">{tabStats.activeReceivableCount}</strong> {t('debts.activeDebtors', {}, 'personas o cuentas con saldo pendiente')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.receivableFooterHelp', {}, 'Dinero prestado o pendiente de recibir que retornará a tus cuentas.')}</span>
              <span className="font-bold text-[var(--accent,#97F2CC)] tabular-nums">{filteredDebts.length} {t('debts.activeCollections', {}, 'cobros activos')}</span>
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

            <div className="pt-3 sm:pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{t('debts.settledFooterHelp', {}, 'Historial de saldos saldados al 100% y cerrados exitosamente.')}</span>
              <span className="font-bold text-emerald-400 tabular-nums">{filteredDebts.length} {t('debts.settledRecords', {}, 'registros completados')}</span>
            </div>
          </>
        )}

      </div>

      {/* 4. SEGMENTED TAB FILTER (Idéntico a Categorías) */}
      <div className="flex items-center justify-between gap-3 relative z-10 w-full min-w-full box-border">
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
            <span>{t('debts.tabPayable', {}, 'Por Pagar (Deudas)')}</span>
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
            <span>{t('debts.tabReceivable', {}, 'Por Cobrar (Préstamos y Cobros)')}</span>
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
            <span>{t('debts.tabCompleted', {}, 'Completados')}</span>
          </button>

        </div>
      </div>

      {/* 5. CARDS LIST CONTAINER */}
      {paginatedDebts.length === 0 ? (
        <EmptyState
          icon={Percent}
          title={t('debts.noDebtsFound', {}, 'No hay compromisos en esta sección')}
          description={t('debts.noDebtsFoundSub', {}, 'Puedes crear un nuevo saldo por pagar o por cobrar haciendo clic en "Nuevo Saldo".')}
          actionText={t('debts.newDebtBtn', {}, 'Nuevo Saldo')}
          onAction={() => {
            setDebtToEdit(null);
            setIsDebtModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              if (daysDiff < 0) {
                urgencyLabel = isEs ? `Vencido hace ${Math.abs(daysDiff)} días` : `Overdue by ${Math.abs(daysDiff)} days`;
                urgencyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold animate-pulse';
              } else if (daysDiff === 0) {
                urgencyLabel = isEs ? 'Vence hoy' : 'Due today';
                urgencyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-bold';
              } else if (daysDiff <= 3) {
                urgencyLabel = isEs ? `Vence en ${daysDiff} días` : `Due in ${daysDiff} days`;
                urgencyColor = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
              } else {
                urgencyLabel = isEs ? `Vence el ${debt.dueDate}` : `Due ${debt.dueDate}`;
              }
            }

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-3xl bg-[#0D1117]/80 border transition-all duration-200 flex flex-col justify-between gap-4 shadow-lg ${
                  isSettled 
                    ? 'border-emerald-500/20 opacity-80' 
                    : debt.isPayable 
                      ? 'border-white/10 hover:border-rose-500/30' 
                      : 'border-white/10 hover:border-[var(--accent,#97F2CC)]/30'
                }`}
              >
                
                {/* Header: Type Badge + Icon + Concept + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                      debt.isPayable 
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' 
                        : 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border-[var(--accent,#97F2CC)]/20'
                    }`}>
                      <DynamicIcon value={catObj?.emoji} fallback="Wallet" className="w-5 h-5 text-lg" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${
                          debt.isPayable 
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                            : 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border-[var(--accent,#97F2CC)]/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${debt.isPayable ? 'bg-rose-400' : 'bg-[var(--accent,#97F2CC)]'}`} />
                          <span>{debt.isPayable ? t('debts.payableBadge', {}, 'Por Pagar') : t('debts.receivableBadge', {}, 'Por Cobrar')}</span>
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
                        setIsDebtModalOpen(true);
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
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">{t('debts.originalAmount', {}, 'Original')}</span>
                    <span className="text-xs font-bold text-white tabular-nums">
                      {formatCurrency(debt.calc.originalAmount, debt.currency || 'USD')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">{t('debts.totalPaid', {}, 'Abonado')}</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(debt.calc.totalPaid, debt.currency || 'USD')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--accent,#97F2CC)] uppercase font-bold block">{t('debts.remaining', {}, 'Restante')}</span>
                    <span className={`text-xs font-extrabold tabular-nums ${
                      isSettled ? 'text-slate-400 line-through' : debt.isPayable ? 'text-rose-300' : 'text-[var(--accent,#97F2CC)]'
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
                            : 'bg-[var(--accent,#97F2CC)]'
                      }`}
                      style={{ width: `${debt.calc.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer Buttons: Abonar + Historial */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleHistory(debt.id, e)}
                    className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('debts.paymentsCount', { count: associatedPayments.length }, `Abonos (${associatedPayments.length})`)}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {!isSettled ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setDebtToPay(debt)}
                      className="h-8 px-3 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>{debt.isPayable ? t('debts.payBtn', {}, 'Abonar') : t('debts.collectBtn', {}, 'Cobrar')}</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" />
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
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
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
      {filteredDebts.length > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredDebts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* 7. MODALS */}
      {/* DebtModal (Crear / Editar) */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setDebtToEdit(null);
        }}
        debtToEdit={debtToEdit}
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
