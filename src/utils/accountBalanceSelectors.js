/**
 * Account Balance Selectors - Pure Financial Ledger Calculation
 * Formula: Available Balance = Initial Balance (accounts.balance) + Incomes - Expenses + Transfers In - Transfers Out
 */

import { parseNumeric } from './formatters';

/**
 * Calculates the exact dynamic available balance for a given account
 * based on its initial/base balance and all associated transactions.
 * 
 * @param {Object} account - The account object (contains balance or initialBalance)
 * @param {Array} transactions - Array of transaction objects
 * @returns {number} The derived available balance
 */
export const calculateAccountAvailableBalance = (account, transactions = []) => {
  if (!account) return 0;

  // Account initial balance from DB column `balance` or alias `initialBalance`
  const initialBalance = parseNumeric(
    account.initialBalance !== undefined && account.initialBalance !== null
      ? account.initialBalance
      : (account.initial_balance !== undefined && account.initial_balance !== null
          ? account.initial_balance
          : account.balance),
    0
  );

  const safeTx = Array.isArray(transactions) ? transactions.filter(Boolean) : [];

  const movements = safeTx.reduce((acc, tx) => {
    if (!tx) return acc;

    const txAccountId = tx.accountId || tx.account_id;
    const txTargetAccountId = tx.targetAccountId || tx.target_account_id || tx.destinationAccountId || tx.destination_account_id;

    // Skip transactions not involving this account
    if (txAccountId !== account.id && txTargetAccountId !== account.id) {
      return acc;
    }

    const amount = parseNumeric(tx.amount, 0);
    const targetAmount = parseNumeric(tx.targetAmount ?? tx.target_amount ?? tx.amount, 0);

    if (tx.type === 'income' && txAccountId === account.id) {
      return acc + amount;
    }

    if (tx.type === 'expense' && txAccountId === account.id) {
      return acc - amount;
    }

    if (tx.type === 'transfer') {
      // Outgoing transfer from this account
      if (txAccountId === account.id) {
        return acc - amount;
      }
      // Incoming transfer into this account
      if (txTargetAccountId === account.id) {
        return acc + targetAmount;
      }
    }

    return acc;
  }, 0);

  return initialBalance + movements;
};

/**
 * Maps a list of raw accounts into fully-hydrated account objects with
 * derived available balance and breakdown metadata.
 * 
 * @param {Array} accountsList - Raw accounts array from DB
 * @param {Array} transactionsList - Array of transactions
 * @returns {Array} Hydrated accounts with calculated balance
 */
export const hydrateAccountsWithLedgerBalances = (accountsList = [], transactionsList = []) => {
  const safeAccs = Array.isArray(accountsList) ? accountsList.filter(Boolean) : [];
  const safeTx = Array.isArray(transactionsList) ? transactionsList.filter(Boolean) : [];

  return safeAccs.map(acc => {
    if (!acc) return acc;

    const initialBalance = parseNumeric(
      acc.initialBalance !== undefined && acc.initialBalance !== null
        ? acc.initialBalance
        : (acc.initial_balance !== undefined && acc.initial_balance !== null
            ? acc.initial_balance
            : acc.balance),
      0
    );

    let totalIncomes = 0;
    let totalExpenses = 0;
    let totalTransfersOut = 0;
    let totalTransfersIn = 0;

    safeTx.forEach(tx => {
      if (!tx) return;

      const txAccountId = tx.accountId || tx.account_id;
      const txTargetAccountId = tx.targetAccountId || tx.target_account_id || tx.destinationAccountId || tx.destination_account_id;

      if (txAccountId !== acc.id && txTargetAccountId !== acc.id) return;

      const amount = parseNumeric(tx.amount, 0);
      const targetAmount = parseNumeric(tx.targetAmount ?? tx.target_amount ?? tx.amount, 0);

      if (tx.type === 'income' && txAccountId === acc.id) {
        totalIncomes += amount;
      } else if (tx.type === 'expense' && txAccountId === acc.id) {
        totalExpenses += amount;
      } else if (tx.type === 'transfer') {
        if (txAccountId === acc.id) {
          totalTransfersOut += amount;
        }
        if (txTargetAccountId === acc.id) {
          totalTransfersIn += targetAmount;
        }
      }
    });

    const netMovements = totalIncomes - totalExpenses - totalTransfersOut + totalTransfersIn;
    const availableBalance = initialBalance + netMovements;

    return {
      ...acc,
      initialBalance,
      initial_balance: initialBalance,
      balance: availableBalance,
      currentBalance: availableBalance,
      current_balance: availableBalance,
      totalIncomes,
      totalExpenses,
      totalTransfersOut,
      totalTransfersIn,
      netMovements
    };
  });
};
