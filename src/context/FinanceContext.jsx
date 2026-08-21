import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { parseNumeric, formatDateISO } from '../utils/formatters';
import { convertToGlobal } from '../utils/currency';
import { detectUserLanguage } from '../utils/defaultCategories';
import { 
  dbFetchAccounts, dbSaveAccount, dbDeleteAccount,
  dbFetchCategories, dbSaveCategory, dbDeleteCategory, seedUserCategories,
  dbFetchTransactions, dbSaveTransaction, dbDeleteTransaction,
  dbFetchLoans, dbSaveLoan, dbDeleteLoan,
  dbFetchSubscriptions, dbSaveSubscription, dbDeleteSubscription,
  processSubscriptionsCron,
  consolidateOldTransactions
} from '../services/supabaseService';
import { useSettings } from './SettingsContext';

const FinanceContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight i18n helper — reads the active language from localStorage.
// No React context needed; works inside async callbacks and class components.
// ─────────────────────────────────────────────────────────────────────────────
function getActiveLang() {
  try {
    const stored =
      localStorage.getItem('growy_language_preference') ||
      localStorage.getItem('growy_language');
    if (stored) return stored.toLowerCase().startsWith('es') ? 'es' : 'en';
    return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

/** Returns the Spanish string when language is 'es', English otherwise. */
function i18nMsg(esText, enText) {
  return getActiveLang() === 'es' ? esText : enText;
}

/** Builds a sync-error message optionally appending the DB error detail. */
function syncErrMsg(err) {
  const base = i18nMsg(
    'Error al sincronizar datos con el servidor',
    'Error syncing data with the server'
  );
  return err?.message ? `${base}: ${err.message}` : base;
}

function deleteErrMsg(err) {
  const base = i18nMsg(
    'No se pudo eliminar el registro. Inténtalo de nuevo.',
    'Could not delete the record. Please try again.'
  );
  return err?.message ? `${base}: ${err.message}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────

export function FinanceProvider({ children, userId = 'usr_admin' }) {
  const { exchangeRates, baseCurrency } = useSettings();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoDebitsNotification, setAutoDebitsNotification] = useState(null);
  const [dbStatusToast, setDbStatusToast] = useState(null);

  const clearAutoDebitsNotification = useCallback(() => setAutoDebitsNotification(null), []);
  const clearDbStatusToast = useCallback(() => setDbStatusToast(null), []);

  const triggerToast = useCallback((type, message) => {
    setDbStatusToast({ type, message });
    setTimeout(() => setDbStatusToast(null), 4500);
  }, []);

  // Helper to sync account balances dynamically in DB & State when transactions change
  const syncBalances = useCallback(async (newTxList, currentAccounts) => {
    const safeTx = Array.isArray(newTxList) ? newTxList.filter(Boolean) : [];
    const safeAccs = Array.isArray(currentAccounts) ? currentAccounts.filter(Boolean) : [];

    const updatedAccs = await Promise.all(safeAccs.map(async (acc) => {
      if (!acc) return acc;
      let netChange = 0;

      safeTx.forEach((tx) => {
        if (!tx) return;
        const amt = parseNumeric(tx.amount, 0);
        const targetAmt = parseNumeric(tx.targetAmount || tx.amount, 0);

        if (tx.type === 'income' && tx.accountId === acc.id) {
          netChange += Math.abs(amt);
        } else if (tx.type === 'expense' && tx.accountId === acc.id) {
          netChange -= Math.abs(amt);
        } else if (tx.type === 'transfer') {
          if (tx.accountId === acc.id) {
            netChange -= Math.abs(amt);
          }
          if (tx.targetAccountId === acc.id) {
            netChange += Math.abs(targetAmt);
          }
        }
      });

      const baseInitial = acc.initialBalance !== undefined ? parseNumeric(acc.initialBalance, 0) : parseNumeric(acc.balance, 0);

      const updatedAccount = {
        ...acc,
        balance: baseInitial + netChange
      };

      // Async DB sync for updated balance directly in Supabase PostgreSQL
      await dbSaveAccount(userId, updatedAccount);
      return updatedAccount;
    }));

    setAccounts(updatedAccs);
    return updatedAccs;
  }, [userId]);

  // Load state 100% connected to Supabase DB
  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    setIsLoading(true);

    async function loadData() {
      try {
        const [dbAccs, dbCats, dbTx, dbLoans, dbSubs] = await Promise.all([
          dbFetchAccounts(userId),
          dbFetchCategories(userId),
          dbFetchTransactions(userId),
          dbFetchLoans(userId),
          dbFetchSubscriptions(userId)
        ]);

        if (!isMounted) return;

        const loadedAccounts = Array.isArray(dbAccs) ? dbAccs : [];
        let loadedCategories = Array.isArray(dbCats) ? dbCats : [];
        const loadedTx = Array.isArray(dbTx) ? dbTx : [];
        const loadedLoans = Array.isArray(dbLoans) ? dbLoans : [];
        const loadedSubs = Array.isArray(dbSubs) ? dbSubs : [];

        // Seed default categories in Supabase DB if zero exist using detected browser language
        if (loadedCategories.length === 0) {
          const userLang = detectUserLanguage();
          const seeded = await seedUserCategories(userId, userLang);
          if (Array.isArray(seeded)) loadedCategories = seeded;
        }

        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setTransactions(loadedTx);
        setLoans(loadedLoans);
        setSubscriptions(loadedSubs);

        // Run DB Auto-Debit Subscription Engine with Deduplication
        const cronRes = await processSubscriptionsCron(userId, loadedAccounts, loadedTx);
        if (isMounted && cronRes && cronRes.processed.length > 0) {
          if (cronRes.newTx && cronRes.newTx.length > 0) {
            setTransactions(prev => [...cronRes.newTx, ...prev]);
          }
          if (cronRes.updatedAccountsMap && Object.keys(cronRes.updatedAccountsMap).length > 0) {
            setAccounts(prev => prev.map(a => cronRes.updatedAccountsMap[a.id] !== undefined ? { ...a, balance: cronRes.updatedAccountsMap[a.id] } : a));
          }
          setAutoDebitsNotification({
            count: cronRes.processed.length,
            names: cronRes.processed.map(s => s.name)
          });
        }
      } catch (e) {
        console.error('❌ Error al cargar datos desde Supabase DB para usuario:', userId, e);
        triggerToast('error', i18nMsg(
          'Error al sincronizar con la base de datos de Supabase',
          'Error syncing data with the Supabase database'
        ));
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [userId, triggerToast]);

  // --- ACCOUNTS ACTIONS ---
  const addAccount = useCallback(async (newAccount) => {
    try {
      const saved = await dbSaveAccount(userId, newAccount);
      if (saved) {
        setAccounts(prev => [...(Array.isArray(prev) ? prev.filter(Boolean) : []), saved]);
        triggerToast('success', i18nMsg('Cuenta guardada correctamente', 'Account saved successfully'));
      }
    } catch (err) {
      console.error('❌ Error en addAccount:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const updateAccount = useCallback(async (updatedAccount) => {
    try {
      const saved = await dbSaveAccount(userId, updatedAccount);
      if (saved) {
        setAccounts(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(a => a.id === saved.id ? saved : a));
        triggerToast('success', i18nMsg('Cuenta actualizada correctamente', 'Account updated successfully'));
      }
    } catch (err) {
      console.error('❌ Error en updateAccount:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const deleteAccount = useCallback(async (accountId) => {
    try {
      const success = await dbDeleteAccount(accountId);
      if (success !== false) {
        setAccounts(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).filter(a => a.id !== accountId));
        triggerToast('success', i18nMsg('Cuenta eliminada correctamente', 'Account deleted successfully'));
      }
    } catch (err) {
      console.error('❌ Error en deleteAccount:', err);
      triggerToast('error', deleteErrMsg(err));
    }
  }, [triggerToast]);

  // --- CATEGORIES ACTIONS ---
  const addCategory = useCallback(async (newCategory) => {
    try {
      const saved = await dbSaveCategory(userId, newCategory);
      if (saved) {
        setCategories(prev => [...(Array.isArray(prev) ? prev.filter(Boolean) : []), saved]);
        triggerToast('success', i18nMsg('Categoría guardada correctamente', 'Category saved successfully'));
      }
    } catch (err) {
      console.error('❌ Error en addCategory:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const updateCategory = useCallback(async (updatedCategory) => {
    try {
      const saved = await dbSaveCategory(userId, updatedCategory);
      if (saved) {
        setCategories(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(c => c.id === saved.id ? saved : c));
        triggerToast('success', i18nMsg('Categoría actualizada correctamente', 'Category updated successfully'));
      }
    } catch (err) {
      console.error('❌ Error en updateCategory:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const deleteCategory = useCallback(async (categoryId) => {
    try {
      const success = await dbDeleteCategory(categoryId);
      if (success !== false) {
        setCategories(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).filter(c => c.id !== categoryId));
        triggerToast('success', i18nMsg('Categoría eliminada correctamente', 'Category deleted successfully'));
      }
    } catch (err) {
      console.error('❌ Error en deleteCategory:', err);
      triggerToast('error', deleteErrMsg(err));
    }
  }, [triggerToast]);

  // --- TRANSACTIONS ACTIONS ---
  const addTransaction = useCallback(async (newTx) => {
    try {
      // 1. Calculate Historical FX Snapshots
      const txCurrency = newTx.currency || 'USD';
      const amountInBaseCurrency = convertToGlobal(newTx.amount, txCurrency, baseCurrency, exchangeRates);
      const exchangeRateAtTransaction = convertToGlobal(1, txCurrency, baseCurrency, exchangeRates);

      const txWithSnapshot = {
        ...newTx,
        exchangeRateAtTransaction,
        amountInBaseCurrency
      };

      const saved = await dbSaveTransaction(userId, txWithSnapshot);
      if (saved) {
        setTransactions(prevTx => {
          const safeTx = Array.isArray(prevTx) ? prevTx.filter(Boolean) : [];
          const updatedTx = [saved, ...safeTx];
          setAccounts(prevAccs => {
            syncBalances(updatedTx, prevAccs);
            return prevAccs;
          });
          return updatedTx;
        });
        triggerToast('success', i18nMsg('Transacción guardada correctamente', 'Transaction saved successfully'));
      }
    } catch (err) {
      console.error('❌ Error en addTransaction:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, syncBalances, triggerToast, baseCurrency, exchangeRates]);

  const updateTransaction = useCallback(async (updatedTx) => {
    try {
      // Find old transaction to preserve FX if amount/currency hasn't changed
      const oldTx = transactions.find(t => t.id === updatedTx.id);
      const amountChanged = oldTx && Number(oldTx.amount) !== Number(updatedTx.amount);
      const currencyChanged = oldTx && oldTx.currency !== updatedTx.currency;
      
      let amountInBaseCurrency = updatedTx.amountInBaseCurrency;
      let exchangeRateAtTransaction = updatedTx.exchangeRateAtTransaction;

      // Recalculate Historical FX Snapshots on update ONLY if needed or if missing
      if (!oldTx || amountChanged || currencyChanged || !exchangeRateAtTransaction) {
        const txCurrency = updatedTx.currency || 'USD';
        amountInBaseCurrency = convertToGlobal(updatedTx.amount, txCurrency, baseCurrency, exchangeRates);
        exchangeRateAtTransaction = convertToGlobal(1, txCurrency, baseCurrency, exchangeRates);
      }

      const txWithSnapshot = {
        ...updatedTx,
        exchangeRateAtTransaction,
        amountInBaseCurrency
      };

      const saved = await dbSaveTransaction(userId, txWithSnapshot);
      if (saved) {
        setTransactions(prevTx => {
          const safeTx = Array.isArray(prevTx) ? prevTx.filter(Boolean) : [];
          const updated = safeTx.map(t => t.id === saved.id ? saved : t);
          setAccounts(prevAccs => {
            syncBalances(updated, prevAccs);
            return prevAccs;
          });
          return updated;
        });
        triggerToast('success', i18nMsg('Transacción actualizada correctamente', 'Transaction updated successfully'));
      }
    } catch (err) {
      console.error('❌ Error en updateTransaction:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, syncBalances, triggerToast, baseCurrency, exchangeRates, transactions]);

  const deleteTransaction = useCallback(async (txId) => {
    try {
      const success = await dbDeleteTransaction(txId);
      if (success !== false) {
        setTransactions(prevTx => {
          const safeTx = Array.isArray(prevTx) ? prevTx.filter(Boolean) : [];
          const updated = safeTx.filter(t => t.id !== txId);
          setAccounts(prevAccs => {
            syncBalances(updated, prevAccs);
            return prevAccs;
          });
          return updated;
        });
        triggerToast('success', i18nMsg('Transacción eliminada correctamente', 'Transaction deleted successfully'));
      }
    } catch (err) {
      console.error('❌ Error en deleteTransaction:', err);
      triggerToast('error', deleteErrMsg(err));
    }
  }, [syncBalances, triggerToast]);

  // --- LOANS ACTIONS ---
  const addLoan = useCallback(async (newLoan) => {
    try {
      const saved = await dbSaveLoan(userId, newLoan);
      if (saved) {
        setLoans(prev => [saved, ...(Array.isArray(prev) ? prev.filter(Boolean) : [])]);
        triggerToast('success', i18nMsg('Saldo pendiente guardado correctamente', 'Pending balance saved successfully'));
      }
    } catch (err) {
      console.error('❌ Error en addLoan:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const updateLoan = useCallback(async (updatedLoan) => {
    try {
      const saved = await dbSaveLoan(userId, updatedLoan);
      if (saved) {
        setLoans(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(l => l.id === saved.id ? saved : l));
        triggerToast('success', i18nMsg('Saldo pendiente actualizado correctamente', 'Pending balance updated successfully'));
      }
    } catch (err) {
      console.error('❌ Error en updateLoan:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const deleteLoan = useCallback(async (loanId) => {
    try {
      const success = await dbDeleteLoan(loanId);
      if (success !== false) {
        setLoans(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).filter(l => l.id !== loanId));
        triggerToast('success', i18nMsg('Saldo pendiente eliminado correctamente', 'Pending balance deleted successfully'));
      }
    } catch (err) {
      console.error('❌ Error en deleteLoan:', err);
      triggerToast('error', deleteErrMsg(err));
    }
  }, [triggerToast]);

  const markLoanAsPaid = useCallback(async (loanId, sourceAccountId, customDebitAmount = null, keepRecord = true) => {
    const safeLoans = Array.isArray(loans) ? loans.filter(Boolean) : [];
    const targetLoan = safeLoans.find(l => l.id === loanId);
    if (!targetLoan) return;

    const actualAmount = customDebitAmount !== null && !isNaN(parseFloat(customDebitAmount))
      ? parseFloat(customDebitAmount)
      : targetLoan.amount;

    const conceptLabel = targetLoan.concept || targetLoan.description || i18nMsg('Deuda', 'Debt');
    const newTx = {
      type: 'expense',
      transactionDate: formatDateISO(),
      accountId: sourceAccountId,
      categoryId: targetLoan.categoryId || null,
      amount: actualAmount,
      currency: targetLoan.currency || 'USD',
      description: i18nMsg(
        `Pago de Saldo Pendiente: ${conceptLabel}`,
        `Pending Balance Payment: ${conceptLabel}`
      )
    };

    try {
      const savedTx = await dbSaveTransaction(userId, newTx);
      if (!savedTx) {
        triggerToast('error', i18nMsg(
          'Error al registrar la transacción de pago en la base de datos',
          'Error registering the payment transaction in the database'
        ));
        return;
      }

      let updatedLoan;
      if (keepRecord) {
        updatedLoan = { ...targetLoan, status: 'settled' };
        await dbSaveLoan(userId, updatedLoan);
        setLoans(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(l => l.id === loanId ? updatedLoan : l));
      } else {
        await dbDeleteLoan(loanId);
        setLoans(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).filter(l => l.id !== loanId));
      }

      setTransactions(prevTx => {
        const updatedTxList = [savedTx, ...(Array.isArray(prevTx) ? prevTx.filter(Boolean) : [])];
        setAccounts(prevAccs => {
          syncBalances(updatedTxList, prevAccs);
          return prevAccs;
        });
        return updatedTxList;
      });

      triggerToast('success', i18nMsg('Saldo marcado como pagado correctamente', 'Balance marked as paid successfully'));
    } catch (err) {
      console.error('❌ Error en markLoanAsPaid:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, loans, syncBalances, triggerToast]);

  // --- SUBSCRIPTIONS ACTIONS ---
  const addSubscription = useCallback(async (newSub) => {
    try {
      const saved = await dbSaveSubscription(userId, newSub);
      if (saved) {
        setSubscriptions(prev => [saved, ...(Array.isArray(prev) ? prev.filter(Boolean) : [])]);
        triggerToast('success', i18nMsg('Suscripción guardada correctamente', 'Subscription saved successfully'));
      }
    } catch (err) {
      console.error('❌ Error en addSubscription:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const updateSubscription = useCallback(async (updatedSub) => {
    try {
      const saved = await dbSaveSubscription(userId, updatedSub);
      if (saved) {
        setSubscriptions(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(s => s.id === saved.id ? saved : s));
        triggerToast('success', i18nMsg('Suscripción actualizada correctamente', 'Subscription updated successfully'));
      }
    } catch (err) {
      console.error('❌ Error en updateSubscription:', err);
      triggerToast('error', syncErrMsg(err));
    }
  }, [userId, triggerToast]);

  const deleteSubscription = useCallback(async (subId) => {
    try {
      const success = await dbDeleteSubscription(subId);
      if (success !== false) {
        setSubscriptions(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).filter(s => s.id !== subId));
        triggerToast('success', i18nMsg('Suscripción eliminada correctamente', 'Subscription deleted successfully'));
      }
    } catch (err) {
      console.error('❌ Error en deleteSubscription:', err);
      triggerToast('error', deleteErrMsg(err));
    }
  }, [triggerToast]);

  const toggleSubscription = useCallback(async (subId) => {
    const safeSubs = Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [];
    const targetSub = safeSubs.find(s => s.id === subId);
    if (!targetSub) return;

    const updatedSub = { ...targetSub, isActive: !targetSub.isActive };
    const saved = await dbSaveSubscription(userId, updatedSub);
    if (saved) {
      setSubscriptions(prev => (Array.isArray(prev) ? prev.filter(Boolean) : []).map(s => s.id === subId ? saved : s));
      const statusLabel = saved.isActive
        ? i18nMsg('activada', 'activated')
        : i18nMsg('pausada', 'paused');
      triggerToast('success', i18nMsg(
        `Suscripción ${statusLabel} correctamente`,
        `Subscription ${statusLabel} successfully`
      ));
    } else {
      triggerToast('error', i18nMsg(
        'Error al actualizar el estado de la suscripción',
        'Error updating subscription status'
      ));
    }
  }, [userId, subscriptions, triggerToast]);

  const consolidateOldHistory = useCallback(async () => {
    const res = await consolidateOldTransactions(userId);
    if (res.success && res.count > 0) {
      const dbTx = await dbFetchTransactions(userId);
      if (dbTx) setTransactions(dbTx);
      triggerToast('success', i18nMsg(
        `Se consolidaron ${res.count} transacciones en ${res.consolidatedGroups} registros.`,
        `Consolidated ${res.count} transactions into ${res.consolidatedGroups} records.`
      ));
    } else {
      triggerToast('info', i18nMsg(
        'No hay transacciones antiguas (>1 año) para consolidar.',
        'No old transactions (>1 year) to consolidate.'
      ));
    }
    return res;
  }, [userId, triggerToast]);

  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeTransactionsList = useMemo(() => Array.isArray(transactions) ? transactions.filter(Boolean) : [], [transactions]);
  const safeLoansList = useMemo(() => Array.isArray(loans) ? loans.filter(Boolean) : [], [loans]);
  const safeSubsList = useMemo(() => Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [], [subscriptions]);

  const value = useMemo(() => ({
    accounts: safeAccountsList,
    categories: safeCategoriesList,
    transactions: safeTransactionsList,
    loans: safeLoansList,
    subscriptions: safeSubsList,
    isInitialized,
    isLoading,
    autoDebitsNotification,
    clearAutoDebitsNotification,
    dbStatusToast,
    clearDbStatusToast,
    consolidateOldHistory,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addLoan,
    updateLoan,
    deleteLoan,
    markLoanAsPaid,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscription
  }), [
    safeAccountsList,
    safeCategoriesList,
    safeTransactionsList,
    safeLoansList,
    safeSubsList,
    isInitialized,
    isLoading,
    autoDebitsNotification,
    clearAutoDebitsNotification,
    dbStatusToast,
    clearDbStatusToast,
    consolidateOldHistory,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addLoan,
    updateLoan,
    deleteLoan,
    markLoanAsPaid,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscription
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
