import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Percent, Trash2, CheckCircle, Search } from 'lucide-react';
import Button from './Button';
import LoanModal from './LoanModal';
import PayLoanModal from './PayLoanModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import CustomSelect from './CustomSelect';
import ExportDropdown from './ExportDropdown';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';

export default function LoansModule() {
  const { loans, categories, accounts, addLoan, updateLoan, deleteLoan, markLoanAsPaid } = useFinance();
  const { formatCurrency, language, t, baseCurrency, exchangeRates } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState(null);
  const [loanToDelete, setLoanToDelete] = useState(null);
  const [loanToPay, setLoanToPay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Status Filter: 'all' (default) | 'pending' | 'paid'
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeLoansList = useMemo(() => Array.isArray(loans) ? loans.filter(Boolean) : [], [loans]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);

  // Status Dropdown Options
  const statusOptions = useMemo(() => [
    { value: 'all', label: t('loans.allBalances', {}, 'Todos los Registros') },
    { value: 'pending', label: t('loans.pendingPayment', {}, 'Pendientes por Pagar') },
    { value: 'paid', label: t('loans.paidHistory', {}, 'Historial de Pagados') }
  ], [t]);

  const filteredLoans = useMemo(() => {
    return safeLoansList.filter(l => {
      if (!l) return false;
      const status = l.status || 'pending';
      const isPaidMatch = status === 'paid' || status === 'settled';

      if (statusFilter === 'pending' && isPaidMatch) return false;
      if (statusFilter === 'paid' && !isPaidMatch) return false;

      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const conceptText = String(l.concept || l.description || '').toLowerCase();
        const catId = l.categoryId || l.category_id;
        const catObj = safeCategoriesList.find(c => c && c.id === catId);
        const catName = String(catObj?.name || '').toLowerCase();
        return conceptText.includes(q) || catName.includes(q);
      }
      return true;
    });
  }, [safeLoansList, statusFilter, searchTerm, safeCategoriesList]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLoans.slice(start, start + pageSize);
  }, [filteredLoans, currentPage, pageSize]);

  const isEs = language === 'es';

  const loanColumns = useMemo(() => [
    { 
      label: isEs ? 'Concepto' : 'Concept', 
      accessor: (l) => (l?.concept || l?.description || '-') 
    },
    { 
      label: isEs ? 'Categoría' : 'Category', 
      accessor: (l) => {
        const catId = l?.categoryId || l?.category_id;
        const catObj = safeCategoriesList.find(c => c && c.id === catId);
        return catObj?.name || (isEs ? 'General' : 'General');
      }
    },
    { 
      label: isEs ? 'Monto Original' : 'Original Amount', 
      accessor: (l) => parseNumeric(l?.amount, 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Moneda' : 'Currency', 
      accessor: (l) => l?.currency || 'USD' 
    },
    { 
      label: isEs ? 'Fecha Inicio' : 'Start Date', 
      accessor: (l) => (l?.startDate || l?.start_date || 'N/A') 
    },
    { 
      label: isEs ? 'Fecha Vencimiento' : 'Due Date', 
      accessor: (l) => (l?.dueDate || l?.due_date || 'N/A') 
    },
    { 
      label: isEs ? 'Estado' : 'Status', 
      accessor: (l) => (l?.status === 'paid' || l?.status === 'settled') ? (isEs ? 'Pagado' : 'Paid') : (isEs ? 'Pendiente' : 'Pending') 
    },
    { 
      label: isEs ? `Monto en ${baseCurrency}` : `Amount in ${baseCurrency}`, 
      accessor: (l) => convertCrossCurrency(parseNumeric(l?.amount, 0), l?.currency || 'USD', baseCurrency, exchangeRates).toFixed(2) 
    }
  ], [safeCategoriesList, isEs, baseCurrency, exchangeRates]);

  // Reactive Consolidated Total Debt based on filtered view
  const totalPendingDebt = useMemo(() => {
    return filteredLoans
      .filter(l => l && (l.status === 'pending' || !l.status))
      .reduce((sum, l) => {
        const val = convertCrossCurrency(
          parseNumeric(l.amount, 0),
          l.currency || 'USD',
          baseCurrency,
          exchangeRates
        );
        return sum + Math.abs(val);
      }, 0);
  }, [filteredLoans, baseCurrency, exchangeRates]);

  const loanSummary = useMemo(() => ({
    totalRecords: filteredLoans.length,
    consolidatedTotal: `${formatCurrency(totalPendingDebt, baseCurrency)}`,
    baseCurrency
  }), [filteredLoans.length, totalPendingDebt, baseCurrency, formatCurrency]);

  const exportFilename = isEs ? 'Growy_Deudas_Pendientes' : 'Growy_Pending_Debts';

  const handleSaveLoan = useCallback((loanData) => {
    if (!loanData) return;
    if (loanToEdit) {
      updateLoan(loanData);
    } else {
      addLoan(loanData);
    }
    setLoanToEdit(null);
  }, [loanToEdit, updateLoan, addLoan]);

  const handleDeleteLoan = useCallback(() => {
    if (!loanToDelete) return;
    deleteLoan(loanToDelete.id);
    setLoanToDelete(null);
  }, [loanToDelete, deleteLoan]);

  const handleConfirmPayLoan = useCallback((loanId, accountId, customDebitAmount, keepRecord, paymentDate) => {
    markLoanAsPaid(loanId, accountId, customDebitAmount, keepRecord, paymentDate);
    setLoanToPay(null);
  }, [markLoanAsPaid]);

  // Helper calculation for urgency status
  const getUrgencyLevel = useCallback((dueDateStr, status) => {
    if (status === 'paid' || status === 'settled') {
      return { color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', label: t('loans.paid', {}, 'Pagado') };
    }
    if (!dueDateStr) return { color: 'border-white/10 bg-white/5 text-slate-300', label: t('loans.onTrack', {}, 'Al día') };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);

      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { color: 'border-rose-500/40 bg-rose-500/15 text-rose-300', label: t('loans.overdue', {}, '¡Vencido!') };
      if (diffDays <= 3) return { color: 'border-rose-500/40 bg-rose-500/10 text-rose-300', label: t('loans.dueInDays', { days: diffDays }, `Vence en ${diffDays}d`) };
      if (diffDays <= 7) return { color: 'border-amber-500/40 bg-amber-500/10 text-amber-300', label: t('loans.dueInDays', { days: diffDays }, `Vence en ${diffDays}d`) };
      return { color: 'border-[var(--accent,#97F2CC)]/30 bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)]', label: t('loans.onTrack', {}, 'Al día') };
    } catch (e) {
      return { color: 'border-white/10 bg-white/5 text-slate-300', label: t('loans.onTrack', {}, 'Al día') };
    }
  }, [t]);

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('loans.title', {}, 'Deudas y Compromisos')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('loans.subtitle', {}, 'Control y seguimiento de deudas pendientes por pagar')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredLoans}
              columns={loanColumns}
              title={t('loans.title', {}, 'Deudas y Compromisos')}
              filename={exportFilename}
              summary={loanSummary}
            />
          </div>

          <Button
            size="md"
            variant="primary"
            icon={Plus}
            onClick={() => {
              setLoanToEdit(null);
              setIsModalOpen(true);
            }}
          >
            <span className="hidden sm:inline">{t('loans.newLoan', {}, 'Nueva Deuda')}</span>
          </Button>
        </div>
      </header>

      {/* KPI HERO BANNER: TOTAL PENDING DEBT */}
      <SectionKpiHero
        title={t('loans.totalPendingDebt', {}, language === 'es' ? 'TOTAL DEUDA PENDIENTE' : 'TOTAL PENDING DEBT')}
        formattedAmount={formatCurrency(totalPendingDebt, baseCurrency)}
        currency={baseCurrency}
        icon={Percent}
        iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
        iconBorderColor="border-[var(--accent,#97F2CC)]/30"
        iconTextColor="text-[var(--accent,#97F2CC)]"
        secondaryLabel={t('loans.showingRecords', { count: filteredLoans.length }, `${language === 'es' ? 'Mostrando' : 'Showing'} ${filteredLoans.length} ${language === 'es' ? 'registros' : 'records'}`)}
        secondaryValue={baseCurrency}
      />

      {/* Responsive Toolbar: Search (Row 1 on mobile), Status Filter & Export (Row 2 on mobile), Single row on desktop */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2 w-full relative z-20">
        {/* Search Bar */}
        <div className="relative w-full sm:flex-1 order-1 sm:order-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('placeholders.search', {}, 'Buscar por concepto o categoría...')}
            className="w-full h-11 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[var(--accent,#97F2CC)] shadow-inner transition-colors"
          />
        </div>

        {/* Status Filter & Mobile Export */}
        <div className="flex items-center justify-between gap-2.5 w-full sm:w-auto order-2 sm:order-1">
          <div className="w-full sm:w-52 shrink-0 flex-1 sm:flex-none">
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t('loans.allBalances', {}, 'Todos los Registros')}
            />
          </div>
          <div className="sm:hidden shrink-0">
            <ExportDropdown
              data={filteredLoans}
              columns={loanColumns}
              title={t('loans.title', {}, 'Deudas y Compromisos')}
              filename={exportFilename}
              summary={loanSummary}
            />
          </div>
        </div>
      </div>

      {/* List View */}
      <div className="w-full space-y-2.5 relative z-10">
        {paginatedLoans.length === 0 ? (
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] text-center text-slate-300 space-y-3">
            <Percent className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base md:text-lg font-bold text-white tracking-tight">{t('loans.noLoansTitle', {}, 'Sin deudas pendientes')}</h3>
            <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto font-normal">
              {t('loans.noLoansDesc', {}, '¡Excelente! No tienes compromisos financieros pendientes de pago en esta categoría.')}
            </p>
            <Button
              size="md"
              variant="primary"
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              {t('loans.newLoan', {}, 'Nueva Deuda')}
            </Button>
          </div>
        ) : (
          paginatedLoans.map((loan) => {
            if (!loan) return null;
            const catId = loan.categoryId || loan.category_id;
            const cat = safeCategoriesList.find(c => c && c.id === catId) || { name: 'Uncategorized', emoji: '📄' };
            const dueDateValue = loan.dueDate || loan.due_date || '';
            const conceptValue = loan.concept || loan.description || 'Saldo Pendiente';
            const urgency = getUrgencyLevel(dueDateValue, loan.status);
            const isPaid = loan.status === 'paid' || loan.status === 'settled';

            return (
              <div
                key={loan.id || Math.random()}
                onClick={() => {
                  setLoanToEdit(loan);
                  setIsModalOpen(true);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl bg-[#162226] border flex flex-col justify-between gap-2.5 transition-all group cursor-pointer ${
                  isPaid ? 'border-emerald-500/20 bg-emerald-500/[0.02] opacity-75' : 'border-white/10 hover:bg-white/[0.06]'
                }`}
              >
                {/* FILA 1: Emoji + Nombre Completo + Badge de Urgencia */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                      isPaid ? 'bg-emerald-400' : urgency.label.includes('Vence') || urgency.label.includes('Vencido') || urgency.label.includes('Overdue') ? 'bg-rose-400 animate-pulse' : 'bg-[var(--accent,#97F2CC)]'
                    }`} />

                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base sm:text-lg shrink-0">
                      {cat?.emoji || '📄'}
                    </div>

                    <h4 className="line-clamp-2 text-sm leading-snug font-medium text-white group-hover:text-[var(--accent,#97F2CC)] transition-colors">
                      {conceptValue}
                    </h4>
                  </div>

                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border shrink-0 ${urgency.color}`}>
                    {urgency.label}
                  </span>
                </div>

                {/* FILA 2: Categoría & Fecha + Monto Grande + Botón Pagar / Acciones */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-medium truncate">
                      {cat?.name || 'Uncategorized'} • {language === 'es' ? 'Vence' : 'Due'}: <strong className="text-white font-semibold">{dueDateValue || 'N/A'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right flex items-center">
                      <span className={`text-sm sm:text-base font-extrabold tabular-nums ${isPaid ? 'text-emerald-400 line-through' : 'text-amber-400'}`}>
                        {formatCurrency(parseNumeric(loan.amount, 0), loan.currency || 'USD')}
                      </span>
                    </div>

                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={CheckCircle}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLoanToPay(loan);
                        }}
                      >
                        {t('common.payNow', {}, 'Pagar')}
                      </Button>
                    )}

                    <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLoanToDelete(loan);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t('common.delete', {}, 'Eliminar')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Universal Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredLoans.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      <LoanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setLoanToEdit(null);
        }}
        onSave={handleSaveLoan}
        loanToEdit={loanToEdit}
        categories={safeCategoriesList}
      />

      <PayLoanModal
        isOpen={!!loanToPay}
        onClose={() => setLoanToPay(null)}
        onConfirmPay={handleConfirmPayLoan}
        loan={loanToPay}
        accounts={safeAccountsList}
      />

      <ConfirmDeleteModal
        isOpen={!!loanToDelete}
        onClose={() => setLoanToDelete(null)}
        onConfirm={handleDeleteLoan}
        itemName={loanToDelete?.concept || loanToDelete?.description || 'deuda pendiente'}
        itemType="deuda pendiente"
      />

    </div>
  );
}
