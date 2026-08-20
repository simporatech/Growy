/**
 * Centralized formatting and safe mathematical utilities for Growy
 */

import { formatCurrency as formatCurrencyUtil } from './currency';

/**
 * Format monetary amount with standard Intl.NumberFormat and symbol overrides
 */
export const formatCurrency = (amount, currency = null, globalCurrency = 'USD') => {
  return formatCurrencyUtil(amount, currency, globalCurrency);
};

/**
 * Format ISO date string into readable local label
 */
export const formatDateLabel = (dateStr, locale = 'es') => {
  if (!dateStr) return 'Hoy';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format complete header date (e.g., "Lunes, 20 de agosto de 2026")
 */
export const formatHeaderDate = (dateObj = new Date(), locale = 'es') => {
  try {
    const rawDateStr = dateObj.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);
  } catch (e) {
    return dateObj.toDateString();
  }
};

/**
 * Format Date to ISO string YYYY-MM-DD
 */
export const formatDateISO = (d = new Date()) => {
  try {
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
};

/**
 * Safe numeric parser preventing NaN, Infinity, or null crashes
 */
export const parseNumeric = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

/**
 * Safe percentage calculation avoiding division by zero
 */
export const calcPercentage = (part, total, fallback = 0) => {
  const safePart = parseNumeric(part, 0);
  const safeTotal = parseNumeric(total, 0);
  if (safeTotal <= 0) return fallback;
  return Math.round((safePart / safeTotal) * 100);
};

/**
 * Safe savings rate calculation
 */
export const calcSavingsRate = (income, expense) => {
  const safeIncome = parseNumeric(income, 0);
  const safeExpense = parseNumeric(expense, 0);
  if (safeIncome <= 0) return 0;
  return Math.max(0, Math.round(((safeIncome - safeExpense) / safeIncome) * 100));
};
