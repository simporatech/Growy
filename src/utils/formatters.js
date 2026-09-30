/**
 * Centralized formatting and safe mathematical utilities for Growy
 */

import { formatCurrency as formatCurrencyUtil } from './currency';
import { getLocalDateString } from './dateUtils';

export { getLocalDateString };

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
    const cleanStr = String(dateStr).split('T')[0];
    const d = new Date(cleanStr + 'T00:00:00');
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
 * Format Date to local YYYY-MM-DD string (timezone-safe, avoids UTC shift)
 */
export const formatDateISO = (d = new Date()) => {
  return getLocalDateString(d);
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

/**
 * Safe timezone-agnostic days difference calculation for YYYY-MM-DD dates
 * Avoids UTC midnight off-by-one bug in negative timezones
 */
export const getDaysDifference = (dueDateStr) => {
  if (!dueDateStr) return null;
  try {
    const cleanStr = String(dueDateStr).split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    const dueDate = new Date(year, month - 1, day);
    dueDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
};

/**
 * Localiza dinámicamente descripciones de transacciones de préstamos.
 * Convierte "Préstamo a: [Persona]" <-> "Loan to: [Persona]" según el idioma activo.
 * @param {string} description 
 * @param {boolean|string} localeOrIsEs - true/'es' para español, false/'en' para inglés
 * @returns {string}
 */
export const formatLoanDescription = (description, localeOrIsEs = true) => {
  if (!description || typeof description !== 'string') return description || '';
  const isEs = typeof localeOrIsEs === 'boolean' 
    ? localeOrIsEs 
    : String(localeOrIsEs || 'es').toLowerCase().startsWith('es');

  const rules = [
    {
      regex: /^(?:pr[eé]stamo\s*recibido\s*de|loan\s*received\s*from):\s*(.+)$/i,
      es: 'Préstamo recibido de',
      en: 'Loan received from'
    },
    {
      regex: /^(?:pr[eé]stamo\s*a|loan\s*to):\s*(.+)$/i,
      es: 'Préstamo a',
      en: 'Loan to'
    },
    {
      regex: /^(?:abono\s*de\s*pr[eé]stamo\s*recuperado|recovered\s*loan\s*payment):\s*(.+)$/i,
      es: 'Abono de préstamo recuperado',
      en: 'Recovered loan payment'
    },
    {
      regex: /^(?:cobro\s*recibido|payment\s*received):\s*(.+)$/i,
      es: 'Cobro recibido',
      en: 'Payment received'
    },
    {
      regex: /^(?:devoluci[oó]n\s*de\s*pr[eé]stamo|loan\s*repayment):\s*(.+)$/i,
      es: 'Devolución de préstamo',
      en: 'Loan repayment'
    },
    {
      regex: /^(?:abono\s*a\s*deuda|debt\s*payment):\s*(.+)$/i,
      es: 'Abono a deuda',
      en: 'Debt payment'
    }
  ];

  for (const rule of rules) {
    const match = description.match(rule.regex);
    if (match) {
      const target = match[1].trim();
      return `${isEs ? rule.es : rule.en}: ${target}`;
    }
  }
  return description;
};
