import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Percent, Trash2, CheckCircle, Search, 
  ArrowDownLeft, ArrowUpRight, History, ChevronDown, 
  ChevronUp, Wallet, Calendar, AlertCircle, Edit3, DollarSign
} from 'lucide-react';
import Button from './Button';
import EmptyState from './EmptyState';
import DebtModal from './DebtModal';
import DebtPaymentModal from './DebtPaymentModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';
import ExportDropdown from './ExportDropdown';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import DynamicIcon from './DynamicIcon';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric, getDaysDifference, formatDateISO } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';
import { calculateDebtRemaining } from '../services/debtsService';

/**
 * DebtsView (Módulo de Saldos Pendientes: Por Pagar, Por Cobrar y Gestión de Abonos)
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

  // Search & Tab Filters: 'all' | 'payable' | 'receivable' | 'completed'
  const [activeTab, setActiveTab] = useState('all');
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

  // Summary Metrics calculations for Top Hero
  const summaryMetrics = useMemo(() => {
    let totalPayableRemaining = 0;
    let totalReceivableRemaining = 0;

    enrichedDebts.forEach(d => {
      if (d.calc.isSettled) return;
      const convertedRemaining = convertCrossCurrency(
        d.calc.remainingAmount, 
        d.currency || 'USD', 
        baseCurrency, 
        exchangeRates
      );

      if (d.isPayable) {
        totalPayableRemaining += convertedRemaining;
      } else {
        totalReceivableRemaining += convertedRemaining;
      }
    });

    const netCommitments = totalReceivableRemaining - totalPayableRemaining;

    return {
      totalPayableRemaining,
      totalReceivableRemaining,
      netCommitments
    };
  }, [enrichedDebts, baseCurrency, exchangeRates]);

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

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized Page Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
            {t('debts.title', {}, 'Saldos Pendientes')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 block font-normal">
            {t('debts.subtitle', {}, 'Controla deudas pendientes, préstamos otorgados y compromisos financieros')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredDebts}
              columns={debtColumns}
              filename={`Growy_Saldos_Pendientes_${formatDateISO()}`}
              title={t('debts.exportTitle', {}, 'Reporte de Saldos Pendientes')}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              setDebtToEdit(null);
              setIsDebtModalOpen(true);
            }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{t('debts.newDebtBtn', {}, 'Nuevo Saldo')}</span>
          </Button>
        </div>
      </header>
      
      {/* 1. TOP KPI HERO BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Por Pagar */}
        <div className="p-5 rounded-3xl bg-[#0D1117]/80 border border-rose-500/20 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              🔴 {t('debts.totalPayableLabel', {}, 'Total Por Pagar (Deudas)')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 tabular-nums">
            {formatCurrency(summaryMetrics.totalPayableRemaining, baseCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {t('debts.payableHelp', {}, 'Suma de saldos pendientes que debes pagar')}
          </span>
        </div>

        {/* Total Por Cobrar */}
        <div className="p-5 rounded-3xl bg-[#0D1117]/80 border border-[var(--accent,#97F2CC)]/20 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent,#97F2CC)]">
              🟢 {t('debts.totalReceivableLabel', {}, 'Total Por Cobrar (A Mi Favor)')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 tabular-nums">
            {formatCurrency(summaryMetrics.totalReceivableRemaining, baseCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {t('debts.receivableHelp', {}, 'Suma de dinero que te deben o prestaste')}
          </span>
        </div>

        {/* Balance Neto */}
        <div className="p-5 rounded-3xl bg-[#0D1117]/80 border border-white/10 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              ⚖️ {t('debts.netBalanceLabel', {}, 'Balance Neto de Compromisos')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black mt-2 tabular-nums ${
            summaryMetrics.netCommitments >= 0 ? 'text-[var(--accent,#97F2CC)]' : 'text-rose-400'
          }`}>
            {summaryMetrics.netCommitments >= 0 ? '+ ' : ''}
            {formatCurrency(summaryMetrics.netCommitments, baseCurrency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {summaryMetrics.netCommitments >= 0 ? t('debts.positiveNet', {}, 'Superávit a favor') : t('debts.negativeNet', {}, 'Déficit en compromisos')}
          </span>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH TOOLBAR */}
      <div className="p-4 rounded-3xl bg-[#0D1117]/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/30 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: t('debts.tabAll', {}, 'Todos') },
              { id: 'payable', label: '🔴 ' + t('debts.tabPayable', {}, 'Por Pagar') },
              { id: 'receivable', label: '🟢 ' + t('debts.tabReceivable', {}, 'Por Cobrar') },
              { id: 'completed', label: '✨ ' + t('debts.tabCompleted', {}, 'Completados') }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#091E15)] shadow-sm scale-[1.01]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Mobile Export */}
          <div className="flex items-center gap-2.5 flex-1 md:justify-end">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('debts.searchPlaceholder', {}, 'Buscar por concepto o categoría...')}
                className="w-full h-10 pl-9 pr-4 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)]"
              />
            </div>

            <div className="sm:hidden shrink-0">
              <ExportDropdown
                data={filteredDebts}
                columns={debtColumns}
                filename={`Growy_Saldos_Pendientes_${formatDateISO()}`}
                title={t('debts.exportTitle', {}, 'Reporte de Saldos Pendientes')}
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. CARDS LIST CONTAINER */}
      {paginatedDebts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0D1117]/80 border border-white/10 backdrop-blur-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] flex items-center justify-center">
            <Percent className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {t('debts.noDebtsFound', {}, 'No hay compromisos en esta sección')}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('debts.noDebtsFoundSub', {}, 'Puedes crear un nuevo saldo por pagar o por cobrar haciendo clic en "Nuevo Saldo".')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setDebtToEdit(null);
              setIsDebtModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{t('debts.newDebtBtn', {}, 'Nuevo Saldo')}</span>
          </Button>
        </div>
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
                      <DynamicIcon value={catObj?.emoji} fallback={debt.isPayable ? '💳' : '🤝'} className="w-5 h-5 text-lg" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          debt.isPayable 
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                            : 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border-[var(--accent,#97F2CC)]/30'
                        }`}>
                          {debt.isPayable ? '🔴 ' + t('debts.payableBadge', {}, 'Por Pagar') : '🟢 ' + t('debts.receivableBadge', {}, 'Por Cobrar')}
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
                  <div className="flex items-center justify-between text-[11px]">
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
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleHistory(debt.id, e)}
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                      className="h-9 px-4 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>{debt.isPayable ? t('debts.payBtn', {}, 'Abonar') : t('debts.collectBtn', {}, 'Cobrar')}</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
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

      {/* 4. PAGINATION */}
      {filteredDebts.length > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredDebts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* 5. MODALS */}
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
