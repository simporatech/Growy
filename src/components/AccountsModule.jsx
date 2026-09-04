import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, Wallet, Search, RotateCcw } from 'lucide-react';
import Button from './Button';
import EmptyState from './common/EmptyState';
import AccountModal from './AccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import CustomSelect from './CustomSelect';
import SectionKpiHero from './SectionKpiHero';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import DynamicIcon from './DynamicIcon';
import { CURRENCY_MAP } from '../utils/currency';

export default function AccountsModule() {
  const { accounts, addAccount, updateAccount, deleteAccount, isLoading, isInitialized } = useFinance();
  const { convertToGlobal, baseCurrency, formatCurrency, t, language } = useSettings();
  const isEs = language === 'es';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const safeAccountsList = useMemo(() => {
    return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  }, [accounts]);

  // Unique currency options for filtering
  const uniqueCurrencies = useMemo(() => {
    const set = new Set(safeAccountsList.map(a => a?.currency || 'USD'));
    const options = Array.from(set).map(curr => ({
      value: curr,
      label: curr,
      name: curr,
      emoji: '💱'
    }));
    return [
      { value: 'all', label: t('common.allCurrencies', {}, language === 'es' ? 'Todas las divisas' : 'All Currencies'), name: t('common.allCurrencies', {}, language === 'es' ? 'Todas las divisas' : 'All Currencies'), emoji: '🌐' },
      ...options
    ];
  }, [safeAccountsList, t, language]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return safeAccountsList.filter(acc => {
      const matchesSearch = (acc?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (acc?.currency || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCurrency = currencyFilter === 'all' || (acc?.currency || 'USD') === currencyFilter;
      return matchesSearch && matchesCurrency;
    });
  }, [safeAccountsList, searchTerm, currencyFilter]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, currencyFilter]);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, currentPage, pageSize]);

  // Consolidated Balance in Base Currency
  const totalConsolidatedBalance = useMemo(() => {
    return safeAccountsList.reduce((sum, acc) => {
      const rawBalance = parseNumeric(acc?.balance, 0);
      const converted = (!acc?.currency || acc.currency === baseCurrency)
        ? rawBalance
        : convertToGlobal(rawBalance, acc.currency);
      return sum + converted;
    }, 0);
  }, [safeAccountsList, convertToGlobal, baseCurrency]);

  const accountColumns = useMemo(() => [
    { label: isEs ? 'Nombre' : 'Name', accessor: (a) => a?.name || '-' },
    { label: isEs ? 'Divisa' : 'Currency', accessor: (a) => a?.currency || 'USD' },
    { label: isEs ? 'Saldo' : 'Balance', accessor: (a) => parseNumeric(a?.balance, 0).toFixed(2) },
    { label: isEs ? 'Saldo en ' + baseCurrency : 'Balance in ' + baseCurrency, accessor: (a) => {
      const rawBalance = parseNumeric(a?.balance, 0);
      const converted = (!a?.currency || a.currency === baseCurrency)
        ? rawBalance
        : convertToGlobal(rawBalance, a.currency);
      return converted.toFixed(2);
    }}
  ], [isEs, baseCurrency, convertToGlobal]);

  const accountSummary = useMemo(() => ({
    totalRecords: filteredAccounts.length,
    consolidatedTotal: formatCurrency(totalConsolidatedBalance, baseCurrency),
    baseCurrency
  }), [filteredAccounts.length, totalConsolidatedBalance, baseCurrency, formatCurrency]);

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
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('accounts.title', {}, 'Gestión de Cuentas')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('accounts.subtitle', {}, 'Billeteras, cuentas de débito y tarjetas de crédito')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExportDropdown
            data={filteredAccounts}
            columns={accountColumns}
            title={t('accounts.title', {}, 'Gestión de Cuentas')}
            filename={exportFilename}
            summary={accountSummary}
          />

          <button
            type="button"
            onClick={() => {
              setAccountToEdit(null);
              setIsModalOpen(true);
            }}
            className="bg-[var(--accent)] text-black font-semibold h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm shadow-sm hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title={t('accounts.newAccount', {}, 'Nueva Cuenta')}
          >
            <Plus className="w-4 h-4" />
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
        iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
        iconBorderColor="border-[var(--accent,#97F2CC)]/30"
        iconTextColor="text-[var(--accent,#97F2CC)]"
        badgeText={language === 'es' ? 'TIEMPO REAL' : 'LIVE'}
        badgeColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border-[var(--accent,#97F2CC)]/30"
        secondaryLabel={t('accounts.showingRecords', { count: filteredAccounts?.length || 0 }, `${filteredAccounts?.length || 0} ${language === 'es' ? 'cuentas' : 'accounts'}`)}
        secondaryValue={baseCurrency}
        isLoading={isLoading || !isInitialized}
      />

      {/* 3. TOOLBAR: UNIFIED CARBON-GRAY FILTER BAR */}
      <div className="w-full bg-[#0D1117]/90 border border-white/10 rounded-2xl p-3 gap-2.5 sm:gap-3 flex flex-wrap items-center relative z-20 backdrop-blur-xl shadow-lg">
        {/* Filtro de Divisa */}
        <div className="w-[120px] sm:w-[135px] shrink-0">
          <CustomSelect
            options={uniqueCurrencies}
            value={currencyFilter}
            onChange={setCurrencyFilter}
            isSmall
          />
        </div>

        {/* Buscador */}
        <div className="flex-1 min-w-[180px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('accounts.searchPlaceholder', {}, language === 'es' ? 'Buscar por nombre o divisa...' : 'Search by name or currency...')}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#121721] border border-white/10 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors"
          />
        </div>

        {/* Reset Button */}
        {(searchTerm || (currencyFilter && currencyFilter !== 'all')) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCurrencyFilter('all');
            }}
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-rose-300 border border-white/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
            title={t('common.clearFilters', {}, language === 'es' ? 'Limpiar filtros' : 'Clear filters')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('common.clear', {}, language === 'es' ? 'Limpiar' : 'Clear')}</span>
          </button>
        )}
      </div>

      {/* Structured Grid layout for Cards */}
      <div className="w-full relative z-10">
        {filteredAccounts.length === 0 ? (
          safeAccountsList.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t('accounts.noAccountsTitle', {}, 'No tienes cuentas registradas')}
              description={t('accounts.noAccountsDesc', {}, 'Agrega tus cuentas bancarias, tarjetas o efectivo para organizar tus finanzas.')}
              actionLabel={t('accounts.newAccount', {}, 'Nueva Cuenta')}
              actionIcon={Plus}
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <EmptyState
              icon={Search}
              title={t('common.noResultsTitle', {}, 'No se encontraron resultados')}
              description={t('common.noResultsDesc', {}, 'Prueba ajustando los filtros o el término de búsqueda.')}
              actionLabel={t('common.clearFilters', {}, 'Limpiar filtros')}
              onAction={() => { setSearchTerm(''); setCurrencyFilter('all'); }}
            />
          )
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
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl border border-white/10 shadow-inner shrink-0 overflow-hidden">
                        <DynamicIcon value={account.emoji} fallback="💳" className="w-5 h-5 sm:w-6 sm:h-6 text-lg sm:text-xl" />
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
        pageSizeOptions={[30, 50, 100]}
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
