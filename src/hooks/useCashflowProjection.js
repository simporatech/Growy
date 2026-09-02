import { useMemo } from 'react';

/**
 * Parsea fechas YYYY-MM-DD o Date en hora local exacta para evitar desfases UTC.
 * @param {string|Date} dateInput 
 * @returns {Date|null}
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }
  const str = String(dateInput).trim();
  const match = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1; // 0-indexed
    const d = parseInt(match[3], 10);
    return new Date(y, m, d, 0, 0, 0, 0);
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

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
    const now = referenceDate instanceof Date 
      ? referenceDate 
      : (referenceDate ? parseLocalDate(referenceDate) || new Date() : new Date());

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (8 para septiembre)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = Math.min(daysInMonth, Math.max(1, now.getDate()));
    const daysRemaining = Math.max(0, daysInMonth - currentDay);

    const startOfToday = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

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

    // Helper to get remaining amount of a debt/loan
    const getRemainingAmount = (debt) => {
      if (debt?.calc?.remainingBalance !== undefined) {
        return Math.max(0, Number(debt.calc.remainingBalance) || 0);
      }
      if (debt?.remainingAmount !== undefined) {
        return Math.max(0, Number(debt.remainingAmount) || 0);
      }
      if (debt?.remaining_amount !== undefined) {
        return Math.max(0, Number(debt.remaining_amount) || 0);
      }
      return Math.max(0, Number(debt?.amount) || 0);
    };

    // 5. Delimitación Estricta de Deudas y Préstamos del Mes (dueDate >= startOfToday && dueDate <= endOfMonth)
    const validPendingDebts = (pendingDebts || []).filter((debt) => {
      if (!debt) return false;
      const isSettled = debt.status === 'paid' || debt.status === 'settled' || debt.calc?.isSettled;
      if (isSettled) return false;

      const rawDueDate = debt.dueDate || debt.due_date;
      if (!rawDueDate) return false;

      const dDate = parseLocalDate(rawDueDate);
      if (!dDate) return false;

      // Solo incluir si: dueDate >= startOfToday && dueDate <= endOfMonth
      return dDate.getTime() >= startOfToday.getTime() && dDate.getTime() <= endOfMonth.getTime();
    });

    // - Deudas por pagar pendientes (type === 'payable' o por defecto) con vencimiento este mes
    const pendingPayablesTotal = validPendingDebts
      .filter((debt) => (debt.type || '').toLowerCase() !== 'receivable')
      .reduce((sum, debt) => {
        const converted = formatToGlobal(getRemainingAmount(debt), debt.currency || baseCurrency);
        return sum + Math.abs(Number(converted) || 0);
      }, 0);

    // + Préstamos por cobrar pendientes (type === 'receivable') con cobro pactado este mes
    const pendingReceivablesTotal = validPendingDebts
      .filter((debt) => (debt.type || '').toLowerCase() === 'receivable')
      .reduce((sum, debt) => {
        const converted = formatToGlobal(getRemainingAmount(debt), debt.currency || baseCurrency);
        return sum + Math.abs(Number(converted) || 0);
      }, 0);

    // Retrocompatibilidad
    const pendingDebtsTotal = pendingPayablesTotal;

    // 6. Projected month-end balance:
    // Saldo Actual - Gastos Variables Proyectados - Suscripciones Pendientes - Deudas por Pagar + Préstamos por Cobrar
    const projectedBalance = Number(
      (currentTotalBalance - projectedDailyExpenses - pendingSubscriptionsTotal - pendingPayablesTotal + pendingReceivablesTotal).toFixed(2)
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
        const txDate = parseLocalDate(dateStr);
        if (txDate && txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
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
        // Future projected days: linear decay based on daily burn rate + specific commitments on or before that day
        const daysIntoFuture = day - currentDay;
        const accumulatedBurn = dailyBurnRate * daysIntoFuture;

        // Check for subscriptions on or before this day (and after currentDay)
        const daySubs = (activeSubscriptions || []).filter((s) => {
          const isActive = s.isActive !== undefined ? s.isActive : (s.is_active !== undefined ? s.is_active : s.status === 'active');
          if (isActive === false) return false;
          const bDay = Number(s?.billingDay || s?.billing_day || s?.day || 0);
          return bDay > currentDay && bDay <= day;
        }).reduce((sum, s) => sum + Math.abs(Number(formatToGlobal(s.amount, s.currency || baseCurrency)) || 0), 0);

        // Deudas por pagar que vencen en o antes de este día
        const dayPayables = validPendingDebts
          .filter((d) => {
            const isReceivable = (d.type || '').toLowerCase() === 'receivable';
            if (isReceivable) return false;
            const dDate = parseLocalDate(d.dueDate || d.due_date);
            if (!dDate) return false;
            return dDate.getDate() <= day;
          })
          .reduce((sum, d) => sum + Math.abs(Number(formatToGlobal(getRemainingAmount(d), d.currency || baseCurrency)) || 0), 0);

        // Préstamos por cobrar que se esperan en o antes de este día
        const dayReceivables = validPendingDebts
          .filter((d) => {
            const isReceivable = (d.type || '').toLowerCase() === 'receivable';
            if (!isReceivable) return false;
            const dDate = parseLocalDate(d.dueDate || d.due_date);
            if (!dDate) return false;
            return dDate.getDate() <= day;
          })
          .reduce((sum, d) => sum + Math.abs(Number(formatToGlobal(getRemainingAmount(d), d.currency || baseCurrency)) || 0), 0);

        const projectedVal = currentTotalBalance - accumulatedBurn - daySubs - dayPayables + dayReceivables;

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
      pendingDebtsTotal: Number(pendingPayablesTotal.toFixed(2)),
      pendingPayablesTotal: Number(pendingPayablesTotal.toFixed(2)),
      pendingReceivablesTotal: Number(pendingReceivablesTotal.toFixed(2)),
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
      pendingPayablesTotal: 0,
      pendingReceivablesTotal: 0,
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
