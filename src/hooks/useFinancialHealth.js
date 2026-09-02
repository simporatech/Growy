import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { parseNumeric, getDaysDifference } from '../utils/formatters';

/**
 * Pure calculation function for Financial Health Scoring
 *
 * @param {Object} params
 * @param {number} params.monthlyIncome - Total income this month (converted to base currency)
 * @param {number} params.monthlyExpenses - Total expenses this month (converted to base currency)
 * @param {Array} params.loans - List of all loans/debts
 * @param {Array} params.categories - List of all categories
 * @param {Array} params.currentMonthTransactions - Transactions of current month
 * @param {Function} [params.formatToGlobal] - Currency conversion helper
 * @param {string} [params.baseCurrency] - Base currency code
 * @param {Function} [params.t] - Translation function
 * @returns {Object} Score, tier, status messages and detailed breakdown
 */
export function calculateFinancialHealth({
  monthlyIncome = 0,
  monthlyExpenses = 0,
  loans = [],
  categories = [],
  currentMonthTransactions = [],
  formatToGlobal = (val) => Number(val || 0),
  baseCurrency = 'USD',
  t = (key, params, fallback) => fallback
} = {}) {
  const income = Math.max(0, Number(monthlyIncome) || 0);
  const expense = Math.max(0, Number(monthlyExpenses) || 0);

  // 1. SAVINGS / EXPENSE RATIO (0 to 40 Points)
  // - Savings >= 20% of Income: 40 pts
  // - Expenses > Income: 0 pts
  // - Scaled proportionally in between
  let savingsPoints = 0;
  let savingsRate = 0;

  if (income > 0) {
    const netSavings = income - expense;
    savingsRate = netSavings / income;

    if (savingsRate >= 0.20) {
      savingsPoints = 40;
    } else if (savingsRate <= 0) {
      savingsPoints = 0;
    } else {
      savingsPoints = Math.round((savingsRate / 0.20) * 40);
    }
  } else {
    // If no income recorded yet:
    // If 0 expenses -> give base neutral points (25); if has expenses with 0 income -> 0 pts
    savingsPoints = expense === 0 ? 25 : 0;
    savingsRate = expense === 0 ? 0.20 : -1;
  }
  savingsPoints = Math.max(0, Math.min(40, savingsPoints));

  // 2. DEBTS UP TO DATE (0 to 30 Points)
  // - 0 overdue debts: 30 pts
  // - 1 overdue debt: 15 pts
  // - >= 2 overdue debts: 0 pts
  const pendingDebts = (loans || []).filter((loan) => {
    if (!loan) return false;
    const status = (loan.status || '').toLowerCase();
    return status !== 'paid' && status !== 'settled';
  });

  const overdueDebts = pendingDebts.filter((loan) => {
    const dueDate = loan.dueDate || loan.due_date;
    if (!dueDate) return false;
    const diff = getDaysDifference(dueDate);
    return diff !== null && diff < 0;
  });

  const overdueCount = overdueDebts.length;
  let debtPoints = 30;
  if (overdueCount === 1) {
    debtPoints = 15;
  } else if (overdueCount >= 2) {
    debtPoints = 0;
  }

  // 3. CATEGORY BUDGET ADHERENCE (0 to 30 Points)
  // - % of expense categories where monthly spending does not exceed target_amount
  const expenseCategories = (categories || []).filter((c) => {
    return c && (c.type === 'expense' || !c.type);
  });

  // Calculate actual spending per category this month
  const categorySpentMap = {};
  (currentMonthTransactions || []).forEach((tx) => {
    if (!tx || (tx.type || '').toLowerCase() !== 'expense') return;
    const catId = tx.categoryId || tx.category_id;
    if (!catId) return;

    const rawAmt = tx.amount !== undefined ? tx.amount : tx.value;
    const amt = Math.abs(Number(formatToGlobal(rawAmt, tx.currency || baseCurrency)) || 0);
    categorySpentMap[catId] = (categorySpentMap[catId] || 0) + amt;
  });

  // Filter categories with an active budget limit
  const budgetedCategories = expenseCategories.filter((c) => {
    const rawBudget = c.targetAmount !== undefined ? c.targetAmount : (c.target_amount !== undefined ? c.target_amount : c.monthly_budget);
    return parseNumeric(rawBudget, 0) > 0;
  });

  let budgetPoints = 30;
  let onTrackCategoriesCount = 0;
  const totalBudgetedCount = budgetedCategories.length;

  if (totalBudgetedCount > 0) {
    budgetedCategories.forEach((c) => {
      const rawBudget = c.targetAmount !== undefined ? c.targetAmount : (c.target_amount !== undefined ? c.target_amount : c.monthly_budget);
      const budgetInBase = (!c.currency || c.currency === baseCurrency)
        ? parseNumeric(rawBudget, 0)
        : Math.abs(Number(formatToGlobal(rawBudget, c.currency)) || 0);

      const spent = categorySpentMap[c.id] || 0;
      if (spent <= budgetInBase) {
        onTrackCategoriesCount++;
      }
    });

    const budgetAdherenceRatio = onTrackCategoriesCount / totalBudgetedCount;
    budgetPoints = Math.round(budgetAdherenceRatio * 30);
  } else {
    // If no budgets configured, check if overall expenses are under control
    budgetPoints = expense <= income ? 30 : Math.max(10, Math.round(30 * (income / (expense || 1))));
    onTrackCategoriesCount = expenseCategories.length;
  }
  budgetPoints = Math.max(0, Math.min(30, budgetPoints));

  // TOTAL SCORE (0 to 100)
  const score = Math.max(0, Math.min(100, savingsPoints + debtPoints + budgetPoints));

  // TIER & DYNAMIC SARCASTIC / REALISTIC MESSAGES
  let tier = 'critical';
  let statusTitleFallback = 'Crítico';
  let statusMsgFallback = 'Alerta roja: tus finanzas están pidiendo auxilio a gritos. ¡Deja de gastar en tonterías!';

  if (score >= 90) {
    tier = 'excellent';
    statusTitleFallback = 'Excelente';
    statusMsgFallback = 'Mírate nada más, pareces adulto funcional. Sigue así y te compras el mundo.';
  } else if (score >= 75) {
    tier = 'good';
    statusTitleFallback = 'Bueno';
    statusMsgFallback = 'Vas bien, pero no te me confíes que cualquier salida de fin de semana te arruina el mes.';
  } else if (score >= 50) {
    tier = 'fair';
    statusTitleFallback = 'Regular';
    statusMsgFallback = 'Sobreviviendo en la cuerda floja. Un imprevisto más y te toca comer aire.';
  }

  const statusTitle = t(`financial_health.tiers.${tier}.title`, {}, statusTitleFallback);
  const statusMessage = t(`financial_health.tiers.${tier}.message`, {}, statusMsgFallback);

  return {
    score,
    tier,
    statusTitle,
    statusMessage,
    breakdown: {
      savings: {
        points: savingsPoints,
        maxPoints: 40,
        rate: Number((savingsRate * 100).toFixed(1)),
        income,
        expense
      },
      debts: {
        points: debtPoints,
        maxPoints: 30,
        overdueCount,
        totalPendingCount: pendingDebts.length
      },
      budget: {
        points: budgetPoints,
        maxPoints: 30,
        onTrackCount: onTrackCategoriesCount,
        totalBudgetedCount
      }
    }
  };
}

/**
 * React Hook for Financial Health Scoring and Dynamic Feedback
 */
export default function useFinancialHealth(overrideParams = {}) {
  let financeContext = null;
  try {
    financeContext = useFinance();
  } catch (e) {
    financeContext = null;
  }

  let settingsContext = null;
  try {
    settingsContext = useSettings();
  } catch (e) {
    settingsContext = null;
  }

  const transactions = overrideParams.transactions || financeContext?.transactions || financeContext?.safeTransactionsList || [];
  const loans = overrideParams.loans || financeContext?.loans || financeContext?.safeLoansList || [];
  const categories = overrideParams.categories || financeContext?.categories || financeContext?.safeCategoriesList || [];

  const convertToGlobal = settingsContext?.convertToGlobal || ((val) => Number(val || 0));
  const formatToGlobal = settingsContext?.formatToGlobal || ((val, curr) => convertToGlobal(val, curr));
  const baseCurrency = settingsContext?.baseCurrency || 'USD';
  const t = settingsContext?.t || ((k, p, fb) => fb);
  const language = settingsContext?.language || 'es';

  const currentMonthTx = useMemo(() => {
    if (overrideParams.currentMonthTransactions) return overrideParams.currentMonthTransactions;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return (transactions || []).filter((tx) => {
      if (!tx) return false;
      const dStr = tx.date || tx.transactionDate || tx.transaction_date;
      if (!dStr) return false;
      try {
        const d = new Date(dStr);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } catch (e) {
        return false;
      }
    });
  }, [transactions, overrideParams.currentMonthTransactions]);

  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    if (overrideParams.monthlyIncome !== undefined && overrideParams.monthlyExpenses !== undefined) {
      return {
        monthlyIncome: overrideParams.monthlyIncome,
        monthlyExpenses: overrideParams.monthlyExpenses
      };
    }

    let inc = 0;
    let exp = 0;

    currentMonthTx.forEach((tx) => {
      const rawAmt = tx.amount !== undefined ? tx.amount : tx.value;
      const amt = Math.abs(Number(convertToGlobal(rawAmt, tx.currency || baseCurrency)) || 0);
      if (tx.type === 'income') inc += amt;
      if (tx.type === 'expense') exp += amt;
    });

    return { monthlyIncome: inc, monthlyExpenses: exp };
  }, [currentMonthTx, convertToGlobal, baseCurrency, overrideParams.monthlyIncome, overrideParams.monthlyExpenses]);

  return useMemo(() => {
    try {
      return calculateFinancialHealth({
        monthlyIncome,
        monthlyExpenses,
        loans,
        categories,
        currentMonthTransactions: currentMonthTx,
        formatToGlobal: (amt, curr) => convertToGlobal(amt, curr),
        baseCurrency,
        t,
        ...overrideParams
      });
    } catch (err) {
      console.error('Error calculating financial health:', err);
      return {
        score: 75,
        tier: 'good',
        statusTitle: 'Bueno',
        statusMessage: 'Tus finanzas se mantienen en equilibrio.',
        breakdown: {
          savings: { points: 30, maxPoints: 40, rate: 15, income: monthlyIncome, expense: monthlyExpenses },
          debts: { points: 30, maxPoints: 30, overdueCount: 0, totalPendingCount: 0 },
          budget: { points: 15, maxPoints: 30, onTrackCount: 0, totalBudgetedCount: 0 }
        }
      };
    }
  }, [
    monthlyIncome,
    monthlyExpenses,
    loans,
    categories,
    currentMonthTx,
    convertToGlobal,
    baseCurrency,
    t,
    language,
    overrideParams
  ]);
}
