import { useMemo } from 'react';

/**
 * Pure calculation function for Month-End Cashflow Projection
 *
 * @param {Object} params
 * @param {number} params.currentTotalBalance - Current consolidated balance in base currency
 * @param {Array} params.currentMonthTransactions - Transactions registered this month
 * @param {Array} params.activeSubscriptions - Active recurring subscriptions
 * @param {Array} params.pendingDebts - Pending debts/commitments
 * @param {Date|string} [params.referenceDate] - Reference date (defaults to new Date())
 * @param {Function} [params.formatToGlobal] - Helper to convert amounts to base currency
 * @param {string} [params.baseCurrency] - Base currency code
 * @returns {Object} Calculation results and chart dataset
 */
export function calculateMonthEndProjection({
  currentTotalBalance = 0,
  currentMonthTransactions = [],
  activeSubscriptions = [],
  pendingDebts = [],
  referenceDate = new Date(),
  formatToGlobal = (amount) => Number(amount || 0),
  baseCurrency = 'USD'
} = {}) {
  try {
    const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = Math.min(daysInMonth, Math.max(1, ref.getDate()));
    const daysRemaining = Math.max(0, daysInMonth - currentDay);

  // 1. Expenses recorded so far this month
  const expensesSoFar = (currentMonthTransactions || [])
    .filter((tx) => {
      if (!tx) return false;
      const txType = (tx.type || '').toLowerCase();
      return txType === 'expense';
    })
    .reduce((sum, tx) => {
      const rawAmt = tx.amount !== undefined ? tx.amount : tx.value;
      const converted = formatToGlobal(rawAmt, tx.currency || baseCurrency);
      return sum + Math.abs(Number(converted) || 0);
    }, 0);

  // Incomes recorded so far this month (for complete flow awareness)
  const incomesSoFar = (currentMonthTransactions || [])
    .filter((tx) => {
      if (!tx) return false;
      const txType = (tx.type || '').toLowerCase();
      return txType === 'income';
    })
    .reduce((sum, tx) => {
      const rawAmt = tx.amount !== undefined ? tx.amount : tx.value;
      const converted = formatToGlobal(rawAmt, tx.currency || baseCurrency);
      return sum + Math.abs(Number(converted) || 0);
    }, 0);

  // 2. Daily Burn Rate (average daily expenses)
  const dailyBurnRate = currentDay > 0 ? (expensesSoFar / currentDay) : 0;

  // 3. Projected variable daily expenses for the rest of the month
  const projectedDailyExpenses = dailyBurnRate * daysRemaining;

  // 4. Pending subscriptions scheduled for remaining days of this month
  const pendingSubscriptionsTotal = (activeSubscriptions || [])
    .filter((sub) => {
      if (!sub) return false;
      const isActive = sub.isActive !== undefined ? sub.isActive : (sub.is_active !== undefined ? sub.is_active : sub.status === 'active');
      if (isActive === false) return false;

      const billingDay = Number(sub.billingDay || sub.billing_day || sub.day || 1);
      // Scheduled later in the month
      return billingDay > currentDay && billingDay <= daysInMonth;
    })
    .reduce((sum, sub) => {
      const converted = formatToGlobal(sub.amount, sub.currency || baseCurrency);
      return sum + Math.abs(Number(converted) || 0);
    }, 0);

  // 5. Pending debts with due date in remaining days of this month
  const pendingDebtsTotal = (pendingDebts || [])
    .filter((debt) => {
      if (!debt) return false;
      const isPending = debt.status !== 'paid' && debt.status !== 'settled';
      if (!isPending) return false;

      const rawDueDate = debt.dueDate || debt.due_date;
      if (!rawDueDate) return false;

      try {
        const dDate = new Date(rawDueDate);
        if (isNaN(dDate.getTime())) return false;
        const dYear = dDate.getFullYear();
        const dMonth = dDate.getMonth();
        const dDay = dDate.getDate();

        // Due in the current month after today
        return dYear === year && dMonth === month && dDay > currentDay && dDay <= daysInMonth;
      } catch (e) {
        return false;
      }
    })
    .reduce((sum, debt) => {
      const rawAmt = debt.remainingAmount !== undefined ? debt.remainingAmount : (debt.remaining_amount !== undefined ? debt.remaining_amount : debt.amount);
      const converted = formatToGlobal(rawAmt, debt.currency || baseCurrency);
      return sum + Math.abs(Number(converted) || 0);
    }, 0);

  // 6. Projected month-end balance
  const projectedBalance = Number(
    (currentTotalBalance - projectedDailyExpenses - pendingSubscriptionsTotal - pendingDebtsTotal).toFixed(2)
  );

  // 7. Trend determination (Threshold +- 1 for stability)
  let trend = 'stable';
  if (projectedBalance > currentTotalBalance + 1) {
    trend = 'positive';
  } else if (projectedBalance < currentTotalBalance - 1) {
    trend = 'negative';
  }

  // 8. Construct Chart Data for solid (actual) and dashed (projected) line rendering
  // Group historical transactions by day
  const dailyNetChange = {};
  for (let d = 1; d <= currentDay; d++) {
    dailyNetChange[d] = 0;
  }

  (currentMonthTransactions || []).forEach((tx) => {
    if (!tx) return;
    const dateStr = tx.date || tx.transactionDate || tx.transaction_date;
    if (!dateStr) return;

    try {
      const txDate = new Date(dateStr);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const txDay = txDate.getDate();
        if (txDay >= 1 && txDay <= currentDay) {
          const rawAmt = tx.amount !== undefined ? tx.amount : tx.value;
          const amt = Math.abs(Number(formatToGlobal(rawAmt, tx.currency || baseCurrency)) || 0);
          if (tx.type === 'income') {
            dailyNetChange[txDay] = (dailyNetChange[txDay] || 0) + amt;
          } else if (tx.type === 'expense') {
            dailyNetChange[txDay] = (dailyNetChange[txDay] || 0) - amt;
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  // Calculate day-by-day actual progression leading up to currentTotalBalance
  const totalNetThisMonth = incomesSoFar - expensesSoFar;
  const startOfMonthBalance = currentTotalBalance - totalNetThisMonth;

  let runningActual = startOfMonthBalance;
  const chartData = [];

  for (let day = 1; day <= daysInMonth; day++) {
    if (day <= currentDay) {
      runningActual += (dailyNetChange[day] || 0);
      const isConnectionPoint = day === currentDay;

      chartData.push({
        day,
        actual: day === currentDay ? Number(currentTotalBalance.toFixed(2)) : Number(runningActual.toFixed(2)),
        projected: isConnectionPoint ? Number(currentTotalBalance.toFixed(2)) : null
      });
    } else {
      // Future projected days: linear decay based on daily burn rate + specific commitments on that day
      const daysIntoFuture = day - currentDay;
      const accumulatedBurn = dailyBurnRate * daysIntoFuture;

      // Check for subscriptions on this specific day
      const daySubs = (activeSubscriptions || []).filter(s => {
        const bDay = Number(s?.billingDay || s?.billing_day || s?.day || 0);
        return bDay > currentDay && bDay <= day;
      }).reduce((sum, s) => sum + Math.abs(Number(formatToGlobal(s.amount, s.currency || baseCurrency)) || 0), 0);

      // Check for debts due up to this day
      const dayDebts = (pendingDebts || []).filter(d => {
        if (d?.status === 'paid' || d?.status === 'settled') return false;
        try {
          const dDate = new Date(d?.dueDate || d?.due_date);
          const dDay = dDate.getDate();
          return dDate.getFullYear() === year && dDate.getMonth() === month && dDay > currentDay && dDay <= day;
        } catch (e) {
          return false;
        }
      }).reduce((sum, d) => sum + Math.abs(Number(formatToGlobal(d.remainingAmount || d.amount, d.currency || baseCurrency)) || 0), 0);

      const projectedVal = currentTotalBalance - accumulatedBurn - daySubs - dayDebts;

      chartData.push({
        day,
        actual: null,
        projected: Number(projectedVal.toFixed(2))
      });
    }
  }

    return {
      projectedBalance,
      dailyBurnRate: Number(dailyBurnRate.toFixed(2)),
      daysRemaining,
      daysInMonth,
      currentDay,
      expensesSoFar: Number(expensesSoFar.toFixed(2)),
      incomesSoFar: Number(incomesSoFar.toFixed(2)),
      projectedDailyExpenses: Number(projectedDailyExpenses.toFixed(2)),
      pendingSubscriptionsTotal: Number(pendingSubscriptionsTotal.toFixed(2)),
      pendingDebtsTotal: Number(pendingDebtsTotal.toFixed(2)),
      trend,
      chartData
    };
  } catch (err) {
    console.error('Error calculating cashflow projection:', err);
    return {
      projectedBalance: Number(currentTotalBalance) || 0,
      dailyBurnRate: 0,
      daysRemaining: 0,
      daysInMonth: 30,
      currentDay: 1,
      expensesSoFar: 0,
      incomesSoFar: 0,
      projectedDailyExpenses: 0,
      pendingSubscriptionsTotal: 0,
      pendingDebtsTotal: 0,
      trend: 'stable',
      chartData: []
    };
  }
}

/**
 * React Hook for Month-End Cashflow Projection
 *
 * @param {Object} params
 * @param {number} params.currentTotalBalance
 * @param {Array} params.currentMonthTransactions
 * @param {Array} params.activeSubscriptions
 * @param {Array} params.pendingDebts
 * @param {Date|string} [params.referenceDate]
 * @param {Function} [params.formatToGlobal]
 * @param {string} [params.baseCurrency]
 * @returns {Object} Cashflow projection calculation results
 */
export default function useCashflowProjection({
  currentTotalBalance = 0,
  currentMonthTransactions = [],
  activeSubscriptions = [],
  pendingDebts = [],
  referenceDate,
  formatToGlobal,
  baseCurrency = 'USD'
} = {}) {
  return useMemo(() => {
    return calculateMonthEndProjection({
      currentTotalBalance,
      currentMonthTransactions,
      activeSubscriptions,
      pendingDebts,
      referenceDate,
      formatToGlobal,
      baseCurrency
    });
  }, [
    currentTotalBalance,
    currentMonthTransactions,
    activeSubscriptions,
    pendingDebts,
    referenceDate,
    formatToGlobal,
    baseCurrency
  ]);
}
