import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, Wallet, Search } from 'lucide-react';
import AccountModal from './AccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import CustomSelect from './CustomSelect';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';

export default function AccountsModule() {
  const { accounts, addAccount, updateAccount, deleteAccount, isLoading, isInitialized } = useFinance();
  const { convertToGlobal, baseCurrency, formatCurrency, t, language } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);

  const uniqueCurrencies = useMemo(() => {
    const codes = [...new Set(safeAccountsList.map(a => a?.currency || 'USD'))];
    return [
      { value: 'all', label: t('accounts.allCurrencies', {}, 'Todas las Divisas') },
      ...codes.map(c => ({ value: c, label: c }))
    ];
  }, [safeAccountsList, t]);

  const filteredAccounts = useMemo(() => {
    return safeAccountsList.filter(a => {
      if (currencyFilter !== 'all' && (a.currency || 'USD') !== currencyFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (a.name || '').toLowerCase().includes(q) ||
        (a.currency || '').toLowerCase().includes(q);
    });
  }, [safeAccountsList, searchTerm, currencyFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, currencyFilter]);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  const isEs = language === 'es';

  const accountColumns = useMemo(() => [
    { 
      label: isEs ? 'Nombre de Cuenta' : 'Account Name', 
      accessor: (a) => a.name || '-' 
    },
    { 
      label: isEs ? 'Moneda' : 'Currency', 
      accessor: (a) => a.currency || 'USD' 
    },
    { 
      label: isEs ? 'Balance Disponible' : 'Available Balance', 
      accessor: (a) => Number(a.balance || 0).toFixed(2) 
    },
    { 
      label: isEs ? `Balance en ${baseCurrency}` : `Balance in ${baseCurrency}`, 
      accessor: (a) => convertToGlobal(parseNumeric(a.balance, 0), a.currency || 'USD').toFixed(2) 
    }
  ], [isEs, baseCurrency, convertToGlobal]);

  // Reactive Consolidated Balance converted to Base Currency
  const totalConsolidatedBalance = useMemo(() => {
    return (filteredAccounts || []).reduce((sum, acc) => {
      if (!acc) return sum;
      const accCurr = acc?.currency || 'USD';
      const balance = parseNumeric(acc?.balance, 0);
      return sum + (convertToGlobal ? convertToGlobal(balance, accCurr) : balance);
    }, 0);
  }, [filteredAccounts, convertToGlobal]);

  const accountSummary = useMemo(() => ({
    totalRecords: filteredAccounts?.length || 0,
    consolidatedTotal: `${formatCurrency ? formatCurrency(totalConsolidatedBalance, baseCurrency) : totalConsolidatedBalance}`,
    baseCurrency
  }), [filteredAccounts?.length, totalConsolidatedBalance, baseCurrency, formatCurrency]);

  const exportFilename = isEs ? 'Growy_Cuentas' : 'Growy_Accounts';

  const handleSaveAccount = useCallback((accountData) => {
    if (!accountData) return;
    if (accountToEdit) {
      updateAccount(accountData);
    } else {
      addAccount(accountData);
    }
    setAccountToEdit(null);
  }, [accountToEdit, updateAccount, addAccount]);

  const handleDeleteAccount = useCallback(() => {
    if (!accountToDelete) return;
    deleteAccount(accountToDelete.id);
    setAccountToDelete(null);
  }, [accountToDelete, deleteAccount]);

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('accounts.title', {}, 'Gestión de Cuentas')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('accounts.subtitle', {}, 'Billeteras, cuentas de débito y tarjetas de crédito')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredAccounts}
              columns={accountColumns}
              title={t('accounts.title', {}, 'Gestión de Cuentas')}
              filename={exportFilename}
              summary={accountSummary}
            />
          </div>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-11 md:h-10 px-3.5 sm:px-4 text-xs font-semibold rounded-xl bg-[#97F2CC] text-[#091E15] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#97F2CC]/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
            title={t('accounts.newAccount', {}, 'Nueva Cuenta')}
          >
            <Plus size={15} className="shrink-0" />
            <span className="hidden sm:inline">{t('accounts.newAccount', {}, 'Nueva Cuenta')}</span>
          </button>
        </div>
      </header>

      {/* KPI HERO BANNER */}
      <SectionKpiHero
        title={t('accounts.totalConsolidatedBalance', {}, language === 'es' ? 'BALANCE TOTAL CONSOLIDADO' : 'TOTAL CONSOLIDATED BALANCE')}
        formattedAmount={formatCurrency ? formatCurrency(totalConsolidatedBalance, baseCurrency) : `${totalConsolidatedBalance}`}
        amount={totalConsolidatedBalance}
        currency={baseCurrency}
        icon={Wallet}
        iconBgColor="bg-emerald-500/15"
        iconBorderColor="border-emerald-500/30"
        iconTextColor="text-emerald-400"
        badgeText={language === 'es' ? 'TIEMPO REAL' : 'LIVE'}
        badgeColor="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        secondaryLabel={t('accounts.showingRecords', { count: filteredAccounts?.length || 0 }, `${filteredAccounts?.length || 0} ${language === 'es' ? 'cuentas' : 'accounts'}`)}
        secondaryValue={baseCurrency}
        isLoading={isLoading || !isInitialized}
      />

      {/* RESPONSIVE TOOLBAR: 2 Rows on Mobile (< sm), 1 Row on Desktop (sm:) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 relative z-20">
        {/* Search Input - Full width on mobile */}
        <div className="w-full sm:flex-1 relative order-1 sm:order-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('placeholders.search', {}, 'Buscar por nombre o divisa...')}
            className="w-full h-11 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
          />
        </div>

        {/* Currency Filter & Mobile Export */}
        <div className="flex items-center justify-between gap-2.5 w-full sm:w-auto order-2 sm:order-1">
          <div className="w-full sm:w-44 shrink-0 flex-1 sm:flex-none">
            <CustomSelect
              options={uniqueCurrencies}
              value={currencyFilter}
              onChange={setCurrencyFilter}
            />
          </div>
          <div className="sm:hidden shrink-0">
            <ExportDropdown
              data={filteredAccounts}
              columns={accountColumns}
              title={t('accounts.title', {}, 'Gestión de Cuentas')}
              filename={exportFilename}
              summary={accountSummary}
            />
          </div>
        </div>
      </div>

      {/* Structured Grid layout for Cards */}
      <div className="w-full relative z-10">
        {filteredAccounts.length === 0 ? (
          <div className="p-6 rounded-2xl glass-card text-center text-slate-300 space-y-3">
            <Wallet className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {safeAccountsList.length === 0 ? t('accounts.noAccountsTitle', {}, 'No tienes cuentas registradas') : (language === 'es' ? 'Sin Resultados de Búsqueda' : 'No Search Results')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto font-normal">
              {safeAccountsList.length === 0 ? t('accounts.noAccountsDesc', {}, 'Agrega tus cuentas bancarias, tarjetas o efectivo para organizar tus finanzas.') : 'Prueba con otro término de búsqueda.'}
            </p>
            {safeAccountsList.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-4 rounded-xl btn-primary-mint font-bold text-xs inline-flex items-center gap-2 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('accounts.newAccount', {}, 'Nueva Cuenta')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {paginatedAccounts.map((account) => {
              const bgGradient = account.color 
                ? `linear-gradient(135deg, ${account.color}25 0%, rgba(30, 45, 50, 0.9) 100%)`
                : 'linear-gradient(135deg, rgba(174, 237, 208, 0.15) 0%, rgba(30, 45, 50, 0.9) 100%)';

              return (
                <div
                  key={account.id}
                  onClick={() => {
                    setAccountToEdit(account);
                    setIsModalOpen(true);
                  }}
                  className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[175px] sm:min-h-[200px] shadow-xl group transition-all duration-300 cursor-pointer"
                  style={{ background: bgGradient }}
                >
                  {/* Top Bar: Bank Brand & EMV Chip */}
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl border border-white/10 shadow-inner shrink-0">
                        {account.emoji || '💳'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                          {account.name}
                        </h3>
                        <span className="text-xs font-semibold text-slate-300 tracking-widest uppercase block mt-0.5">
                          {account.currency || 'USD'}
                        </span>
                      </div>
                    </div>

                    {/* Simulation EMV Chip */}
                    <div className="w-8 sm:w-9 h-6 sm:h-7 rounded-md bg-amber-400/20 border border-amber-300/30 flex items-center justify-center opacity-80 shrink-0">
                      <div className="w-5 sm:w-6 h-3.5 sm:h-4 border border-amber-300/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                        <div className="bg-amber-300/30 rounded-xs" />
                        <div className="bg-amber-300/30 rounded-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Middle Balance Amount */}
                  <div className="relative z-10 my-auto py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block mb-0.5">
                        {t('accounts.availableBalance', {}, 'Balance Disponible')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                        {t('accounts.initial_balance_label', {}, t('modals.account.initialBalance', {}, 'Inicial'))}: {formatCurrency(account.initialBalance ?? account.balance ?? 0, account.currency)}
                      </span>
                    </div>
                    <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums truncate">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </div>

                  {/* Bottom Footer Bar: Account Actions */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/10 relative z-10">
                    <span className="text-xs text-slate-300 font-medium tabular-nums">
                      **** **** {account.id ? account.id.slice(-4) : '8888'}
                    </span>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccountToDelete(account);
                        }}
                        className="p-1.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
        )}
      </div>

      {/* Universal Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredAccounts.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAccountToEdit(null);
        }}
        onSave={handleSaveAccount}
        accountToEdit={accountToEdit}
      />

      <ConfirmDeleteModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDeleteAccount}
        itemName={accountToDelete?.name || 'cuenta'}
        itemType="cuenta"
      />

    </div>
  );
}
