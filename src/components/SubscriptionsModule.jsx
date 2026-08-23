import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Search } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { convertCrossCurrency } from '../utils/currency';

export default function SubscriptionsModule() {
  const { subscriptions, accounts, categories, addSubscription, updateSubscription, deleteSubscription, toggleSubscription } = useFinance();
  const { formatCurrency, t, baseCurrency, exchangeRates, language } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subToEdit, setSubToEdit] = useState(null);
  const [subToDelete, setSubToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeSubsList = useMemo(() => Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [], [subscriptions]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);

  // Sort subscriptions chronologically by billingDay (1 to 31)
  const sortedSubs = useMemo(() => {
    return [...safeSubsList].sort((a, b) => (parseNumeric(a.billingDay, 0)) - (parseNumeric(b.billingDay, 0)));
  }, [safeSubsList]);

  const filteredSubs = useMemo(() => {
    if (!searchTerm.trim()) return sortedSubs;
    const q = searchTerm.toLowerCase();
    return sortedSubs.filter(s =>
      (s.name || '').toLowerCase().includes(q)
    );
  }, [sortedSubs, searchTerm]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedSubs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubs.slice(start, start + pageSize);
  }, [filteredSubs, currentPage, pageSize]);

  const isEs = language === 'es';

  const subColumns = useMemo(() => [
    { 
      label: isEs ? 'Servicio' : 'Service', 
      accessor: (s) => s.name || '-' 
    },
    { 
      label: isEs ? 'Cuenta de Pago' : 'Paying Account', 
      accessor: (s) => safeAccountsList.find(a => a?.id === s.accountId)?.name || (isEs ? 'General' : 'General') 
    },
    { 
      label: isEs ? 'Categoría' : 'Category', 
      accessor: (s) => safeCategoriesList.find(c => c?.id === s.categoryId)?.name || (isEs ? 'General' : 'General') 
    },
    { 
      label: isEs ? 'Monto' : 'Amount', 
      accessor: (s) => Number(s.amount || 0).toFixed(2) 
    },
    { 
      label: isEs ? 'Moneda' : 'Currency', 
      accessor: (s) => s.currency || safeAccountsList.find(a => a?.id === s.accountId)?.currency || 'USD' 
    },
    { 
      label: isEs ? 'Día de Cobro' : 'Billing Day', 
      accessor: (s) => `${s.billingDay || 1}` 
    },
    { 
      label: isEs ? 'Frecuencia' : 'Frequency', 
      accessor: (s) => s.frequency === 'yearly' ? (isEs ? 'Anual' : 'Yearly') : (isEs ? 'Mensual' : 'Monthly') 
    },
    { 
      label: isEs ? 'Estado' : 'Status', 
      accessor: (s) => (s.isActive !== undefined ? s.isActive : s.is_active !== false) ? (isEs ? 'Activo' : 'Active') : (isEs ? 'Pausado' : 'Paused') 
    },
    { 
      label: isEs ? `Monto Mensual en ${baseCurrency}` : `Monthly Amount in ${baseCurrency}`, 
      accessor: (s) => {
        const subCurrency = s.currency || safeAccountsList.find(a => a?.id === s.accountId)?.currency || 'USD';
        const monthlyAmount = s.frequency === 'yearly' ? (Number(s.amount || 0) / 12) : Number(s.amount || 0);
        return convertCrossCurrency(monthlyAmount, subCurrency, baseCurrency, exchangeRates).toFixed(2);
      }
    }
  ], [safeAccountsList, safeCategoriesList, isEs, baseCurrency, exchangeRates]);

  // Calculate monthly total commitment in Base Currency based on active subscriptions
  const monthlyTotal = useMemo(() => {
    return filteredSubs
      .filter(sub => (sub.isActive !== undefined ? sub.isActive : sub.is_active !== false))
      .reduce((acc, sub) => {
        const monthlyAmount = sub.frequency === 'yearly' ? (Number(sub.amount) / 12) : Number(sub.amount);
        const subCurrency = sub.currency || safeAccountsList.find(a => a?.id === sub.accountId)?.currency || 'USD';
        return acc + convertCrossCurrency(monthlyAmount, subCurrency, baseCurrency, exchangeRates);
      }, 0);
  }, [filteredSubs, safeAccountsList, baseCurrency, exchangeRates]);

  const subSummary = useMemo(() => ({
    totalRecords: filteredSubs.length,
    consolidatedTotal: `${formatCurrency(monthlyTotal, baseCurrency)}/mes`,
    baseCurrency
  }), [filteredSubs.length, monthlyTotal, baseCurrency, formatCurrency]);

  const exportFilename = isEs ? 'Growy_Suscripciones' : 'Growy_Subscriptions';

  const handleSaveSub = useCallback((subData) => {
    if (!subData) return;
    if (subToEdit) {
      updateSubscription(subData);
    } else {
      addSubscription(subData);
    }
    setSubToEdit(null);
  }, [subToEdit, updateSubscription, addSubscription]);

  const handleDeleteSub = useCallback(() => {
    if (!subToDelete) return;
    deleteSubscription(subToDelete.id);
    setSubToDelete(null);
  }, [subToDelete, deleteSubscription]);

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('subscriptions.title', {}, 'Gestión de Suscripciones')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('subscriptions.subtitle', {}, 'Servicios recurrentes y débitos automáticos mensuales')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredSubs}
              columns={subColumns}
              title={t('subscriptions.title', {}, 'Gestión de Suscripciones')}
              filename={exportFilename}
              summary={subSummary}
            />
          </div>

          <button
            onClick={() => {
              setSubToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-11 md:h-10 px-3.5 sm:px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span className="hidden sm:inline">{t('subscriptions.newSubscription', {}, 'Nueva Suscripción')}</span>
          </button>
        </div>
      </header>

      {/* KPI HERO BANNER: MONTHLY SUBSCRIPTIONS TOTAL */}
      <SectionKpiHero
        title={t('subscriptions.totalMonthly', {}, language === 'es' ? 'TOTAL MENSUAL EN SUSCRIPCIONES' : 'TOTAL MONTHLY SUBSCRIPTIONS')}
        formattedAmount={formatCurrency(monthlyTotal, baseCurrency)}
        currency={baseCurrency}
        icon={RefreshCw}
        iconBgColor="bg-sky-500/15"
        iconBorderColor="border-sky-500/30"
        iconTextColor="text-sky-400"
        secondaryLabel={t('subscriptions.activeServices', { count: filteredSubs.filter(s => (s.isActive !== undefined ? s.isActive : s.is_active !== false)).length }, `${filteredSubs.filter(s => (s.isActive !== undefined ? s.isActive : s.is_active !== false)).length} ${language === 'es' ? 'servicios activos' : 'active services'}`)}
        secondaryValue={baseCurrency}
      />

      {/* Toolbar: Search and Mobile Export */}
      <div className="flex items-center gap-2 w-full relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('placeholders.search', {}, 'Buscar por nombre de servicio...')}
            className="w-full h-11 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
          />
        </div>
        <div className="sm:hidden shrink-0">
          <ExportDropdown
            data={filteredSubs}
            columns={subColumns}
            title={t('subscriptions.title', {}, 'Gestión de Suscripciones')}
            filename={exportFilename}
            summary={subSummary}
          />
        </div>
      </div>

      {/* Chronological Timeline List */}
      <div className="w-full space-y-2.5 relative z-10">
        {paginatedSubs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#1E2D32]/60 border border-white/10 backdrop-blur-md text-center text-slate-300 space-y-3">
            <RefreshCw className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
              {safeSubsList.length === 0 ? t('subscriptions.noSubsTitle', {}, 'No tienes suscripciones activas') : 'Sin resultados de búsqueda'}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 max-w-sm mx-auto font-normal">
              {safeSubsList.length === 0 ? t('subscriptions.noSubsDesc', {}, 'Agrega servicios como Netflix, Spotify o iCloud para gestionar tus cobros automáticos.') : 'Prueba con otro término de búsqueda.'}
            </p>
            {safeSubsList.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="h-11 md:h-10 px-4 rounded-xl btn-primary-mint font-bold text-xs inline-flex items-center gap-2 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('subscriptions.newSubscription', {}, 'Nueva Suscripción')}
              </button>
            )}
          </div>
        ) : (
          paginatedSubs.map((sub) => {
            const acc = safeAccountsList.find(a => a?.id === sub.accountId);
            const cat = safeCategoriesList.find(c => c?.id === sub.categoryId);
            const isYearly = sub.frequency === 'yearly';
            const subCurrency = sub.currency || acc?.currency || 'USD';
            const convertedInBase = convertCrossCurrency(sub.amount, subCurrency, baseCurrency, exchangeRates);

            return (
              <div
                key={sub.id}
                onClick={() => {
                  setSubToEdit(sub);
                  setIsModalOpen(true);
                }}
                className={`p-3.5 sm:p-4 rounded-2xl bg-[#162226] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all group cursor-pointer ${
                  sub.isActive 
                    ? 'border-white/10 hover:border-[#AEEDD0]/30 hover:bg-white/[0.04]' 
                    : 'border-white/5 opacity-60 bg-black/20'
                }`}
              >
                {/* Left Block: Day Badge + Emoji + Name */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                      {t('subscriptions.dayBadge', {}, 'DÍA')}
                    </span>
                    <span className="text-sm font-extrabold text-[var(--color-primary,#AEEDD0)] leading-none mt-0.5 tabular-nums">
                      {sub.billingDay || 1}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                    {sub.emoji || '🔄'}
                  </div>

                  <div className="min-w-0 flex-1 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors leading-snug">
                        {sub.name}
                      </h4>
                      {isYearly && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase shrink-0">
                          {t('subscriptions.yearly', {}, 'Anual')}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                      {acc ? acc.name : t('common.generalAccount', {}, 'Cuenta General')} • {cat ? cat.name : t('common.general', {}, 'General')}
                    </p>
                  </div>
                </div>

                {/* Right Block: Amount + Active Toggle Switch + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-extrabold text-white tabular-nums">
                      {formatCurrency(sub.amount, subCurrency)}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        {isYearly ? (language === 'es' ? '/ año' : '/ yr') : (language === 'es' ? '/ mes' : '/ mo')}
                      </span>
                    </div>
                    {subCurrency !== baseCurrency && (
                      <div className="text-[10px] text-slate-400 font-medium tabular-nums">
                        ≈ {formatCurrency(convertedInBase, baseCurrency)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* iOS Style Micro Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubscription(sub.id);
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        sub.isActive ? 'bg-[var(--color-primary,#AEEDD0)]' : 'bg-white/10'
                      }`}
                      title={sub.isActive ? t('common.active', {}, 'Activo') : t('common.paused', {}, 'Pausado')}
                    >
                      <div className={`w-5 h-5 rounded-full bg-[#131E22] transition-transform shadow-sm ${
                        sub.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>

                    <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubToDelete(sub);
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
        totalItems={filteredSubs.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSubToEdit(null);
        }}
        onSave={handleSaveSub}
        subscriptionToEdit={subToEdit}
        accounts={safeAccountsList}
        categories={safeCategoriesList}
      />

      <ConfirmDeleteModal
        isOpen={!!subToDelete}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleDeleteSub}
        itemName={subToDelete?.name || 'suscripción'}
        itemType="suscripción"
      />

    </div>
  );
}
