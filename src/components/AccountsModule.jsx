import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Wallet, Search } from 'lucide-react';
import AccountModal from './AccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, parseNumeric } from '../utils/formatters';

export default function AccountsModule() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  const { convertToGlobal, baseCurrency, formatCurrency, t } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return safeAccountsList;
    const q = searchTerm.toLowerCase();
    return safeAccountsList.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.currency || '').toLowerCase().includes(q)
    );
  }, [safeAccountsList, searchTerm]);

  const accountColumns = useMemo(() => [
    { label: t('modals.account.name', {}, 'Nombre'), accessor: (a) => a.name || '-' },
    { label: t('modals.account.currency', {}, 'Divisa'), accessor: (a) => a.currency || 'USD' },
    { label: t('modals.account.balance', {}, 'Balance Actual'), accessor: (a) => `${a.currencySymbol || '$'}${Number(a.balance || 0).toFixed(2)}` }
  ], [t]);

  // Group balances by currency code
  const currencyGroupedBalances = useMemo(() => {
    return safeAccountsList.reduce((acc, account) => {
      if (!account) return acc;
      const code = account.currency || 'USD';
      const symbol = account.currencySymbol || '$';
      if (!acc[code]) {
        acc[code] = { symbol, total: 0 };
      }
      acc[code].total += parseNumeric(account.balance, 0);
      return acc;
    }, {});
  }, [safeAccountsList]);

  // RULE 2: Total Consolidated Balance converted to Base Currency
  const totalConsolidatedBalance = useMemo(() => {
    return safeAccountsList.reduce((sum, acc) => {
      if (!acc) return sum;
      const accCurr = acc.currency || 'USD';
      return sum + convertToGlobal(parseNumeric(acc.balance, 0), accCurr);
    }, 0);
  }, [safeAccountsList, convertToGlobal]);

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

  const currencyKeys = useMemo(() => Object.keys(currencyGroupedBalances), [currencyGroupedBalances]);

  return (
    <div className="w-full space-y-4 sm:space-y-6 animate-fadeIn">
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white truncate">
            {t('accounts.title', {}, 'Gestión de Cuentas')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            <span>
              {t('accounts.consolidatedBalance', {}, 'Balance Consolidado')}: <strong className="text-white font-bold tabular-nums">{formatCurrency(totalConsolidatedBalance)} {baseCurrency}</strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredAccounts}
              columns={accountColumns}
              title={t('accounts.title', {}, 'Gestión de Cuentas')}
              filename="cuentas_growy"
            />
          </div>

          <button
            onClick={() => {
              setAccountToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-9 sm:h-10 px-3 sm:px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t('accounts.newAccount', {}, 'Nueva Cuenta')}</span>
            <span className="sm:hidden">{t('common.new', {}, 'Nueva')}</span>
          </button>
        </div>
      </header>

      {/* Toolbar: Search and Mobile Export */}
      <div className="flex items-center gap-2 w-full relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('placeholders.search', {}, 'Buscar por nombre...')}
            className="w-full h-10 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
          />
        </div>
        <div className="sm:hidden shrink-0">
          <ExportDropdown
            data={filteredAccounts}
            columns={accountColumns}
            title={t('accounts.title', {}, 'Gestión de Cuentas')}
            filename="cuentas_growy"
          />
        </div>
      </div>

      {/* Structured Grid layout for Cards */}
      <div className="w-full relative z-10">
        {filteredAccounts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#1E2D32]/60 border border-white/10 backdrop-blur-md text-center text-slate-300 space-y-3">
            <Wallet className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {safeAccountsList.length === 0 ? t('accounts.noAccountsTitle', {}, 'No tienes cuentas registradas') : 'Sin resultados de búsqueda'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAccounts.map((account) => {
              const bgGradient = account.color 
                ? `linear-gradient(135deg, ${account.color}25 0%, rgba(30, 45, 50, 0.9) 100%)`
                : 'linear-gradient(135deg, rgba(174, 237, 208, 0.15) 0%, rgba(30, 45, 50, 0.9) 100%)';

              return (
                <div
                  key={account.id}
                  className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[175px] sm:min-h-[200px] shadow-xl group transition-all duration-300"
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
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-300 tracking-widest uppercase block">
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
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-0.5">
                      {t('accounts.availableBalance', {}, 'Balance Disponible')}
                    </span>
                    <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums truncate">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </div>

                  {/* Bottom Footer Bar: Account Actions */}
                  <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/10 relative z-10">
                    <span className="text-[11px] sm:text-xs text-slate-400 font-medium tabular-nums">
                      **** **** {account.id ? account.id.slice(-4) : '8888'}
                    </span>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setAccountToEdit(account);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title={t('common.edit', {}, 'Editar')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAccountToDelete(account)}
                        className="p-1.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t('common.delete', {}, 'Eliminar')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

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
