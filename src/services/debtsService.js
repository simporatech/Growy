import { supabase } from '../lib/supabaseClient.js';
import { toCamel, isValidUuid } from './supabaseService.js';

/**
 * Service for handling debt payments (abonos) in Supabase DB
 * Table: debt_payments
 * Parent Table: pending_debts
 */

/**
 * Calculates dynamic remaining balance, total paid, settlement status and progress percentage.
 * Handles defensive parsing for null, undefined, strings, and both snake_case/camelCase schemas.
 * 
 * @param {Object} debt - The debt/loan object
 * @param {Array} payments - Array of debt payment records
 * @returns {Object} Calculation breakdown
 */
export const calculateDebtRemaining = (debt, payments = []) => {
  if (!debt || typeof debt !== 'object') {
    return {
      originalAmount: 0,
      totalPaid: 0,
      remainingAmount: 0,
      isSettled: true,
      progressPercentage: 0,
      paymentsCount: 0
    };
  }

  const safePayments = Array.isArray(payments) ? payments : [];
  const debtId = debt.id;

  // Filter payments associated with this specific debt
  const debtPayments = safePayments.filter((p) => {
    if (!p) return false;
    const pDebtId = p.debtId !== undefined ? p.debtId : p.debt_id;
    return String(pDebtId) === String(debtId);
  });

  // Calculate sum of payments
  const totalPaid = debtPayments.reduce((acc, p) => {
    const rawAmt = p.amount !== undefined ? p.amount : (p.paidAmount || 0);
    const amt = parseFloat(rawAmt);
    return acc + (isNaN(amt) ? 0 : Math.abs(amt));
  }, 0);

  const rawOriginalAmount = debt.amount !== undefined ? debt.amount : (debt.originalAmount || 0);
  const parsedOriginalAmount = parseFloat(rawOriginalAmount);
  const originalAmount = isNaN(parsedOriginalAmount) ? 0 : Math.max(0, parsedOriginalAmount);

  const remainingAmount = Math.max(0, parseFloat((originalAmount - totalPaid).toFixed(2)));
  const isSettled = remainingAmount <= 0.001 || debt.status === 'paid' || debt.status === 'settled';

  const progressPercentage = originalAmount > 0 
    ? Math.min(100, parseFloat(((totalPaid / originalAmount) * 100).toFixed(1)))
    : 0;

  return {
    originalAmount,
    totalPaid,
    remainingAmount,
    isSettled,
    progressPercentage,
    paymentsCount: debtPayments.length
  };
};

/**
 * Fetches all payments (abonos) for a specific debt, ordered newest to oldest.
 * 
 * @param {string} debtId - The ID (UUID or text) of the debt in pending_debts
 * @returns {Promise<Array|null>} Array of payments in camelCase format or null on error
 */
export const fetchDebtPayments = async (debtId) => {
  if (!debtId) return [];
  console.log('📡 [Supabase DB] Obteniendo abonos para la deuda:', debtId);

  try {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('payment_date', { ascending: false });

    if (error) {
      // If payment_date column is named created_at or other variation, try fallback
      if (error.message.includes('column') || error.code === '42703') {
        const fallback = await supabase
          .from('debt_payments')
          .select('*')
          .eq('debt_id', debtId);
        if (!fallback.error && fallback.data) {
          return toCamel(fallback.data);
        }
      }
      console.warn('⚠️ [Supabase DB] Error obteniendo abonos de deuda:', error.message);
      return [];
    }

    console.log(`✅ [Supabase DB] Obtenidos ${data?.length || 0} abonos para deuda:`, debtId);
    return toCamel(data || []);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] fetchDebtPayments:', err);
    return [];
  }
};

/**
 * Fetches all debt payments for a specific user to hydrate global debts state.
 * 
 * @param {string} userId - The user ID (TEXT format)
 * @returns {Promise<Array>} Array of all user payments in camelCase format
 */
export const fetchAllUserDebtPayments = async (userId) => {
  if (!userId) return [];
  console.log('📡 [Supabase DB] Obteniendo todos los abonos para usuario:', userId);

  try {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) {
      if (error.message.includes('column') || error.code === '42703') {
        const fallback = await supabase
          .from('debt_payments')
          .select('*')
          .eq('user_id', userId);
        if (!fallback.error && fallback.data) {
          return toCamel(fallback.data);
        }
      }
      console.warn('⚠️ [Supabase DB] Error obteniendo historial de abonos del usuario:', error.message);
      return [];
    }

    console.log(`✅ [Supabase DB] Obtenidos ${data?.length || 0} abonos de usuario:`, userId);
    return toCamel(data || []);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] fetchAllUserDebtPayments:', err);
    return [];
  }
};

/**
 * Adds a new debt payment (abono) to debt_payments table.
 * 
 * @param {Object} paymentData
 * @param {string} paymentData.debtId - Target debt UUID
 * @param {string} paymentData.userId - User ID
 * @param {number} paymentData.amount - Amount paid
 * @param {string} paymentData.paymentDate - Date of payment (YYYY-MM-DD)
 * @param {string} [paymentData.accountId] - Optional bank account ID used to pay
 * @param {string} [paymentData.transactionId] - Optional linked transaction ID
 * @param {string} [paymentData.notes] - Optional payment notes / description
 * @returns {Promise<Object|null>} Created payment object in camelCase or null on failure
 */
export const addDebtPayment = async ({
  debtId,
  userId,
  amount,
  paymentDate = new Date().toISOString().split('T')[0],
  accountId = null,
  transactionId = null,
  notes = ''
}) => {
  if (!debtId || !userId) {
    console.error('❌ Error: debtId y userId son requeridos para registrar un abono.');
    return null;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error('❌ Error: El monto del abono debe ser un número positivo mayor a cero.');
    return null;
  }

  const payload = {
    debt_id: debtId,
    user_id: String(userId),
    amount: numAmount,
    payment_date: paymentDate || new Date().toISOString().split('T')[0],
    account_id: isValidUuid(accountId) ? accountId : null,
    transaction_id: isValidUuid(transactionId) ? transactionId : null,
    notes: (notes || '').trim()
  };

  console.log('🚀 [Supabase DB] Insertando abono de deuda:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    // Resilient retry loop to handle optional column schema differences in PostgreSQL
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await supabase
        .from('debt_payments')
        .insert([currentPayload])
        .select();

      data = res.data;
      error = res.error;

      if (!error) break;

      console.warn(`⚠️ [Supabase DB] Error insertando abono (intento ${attempt + 1}):`, error.message);

      // Check if optional columns are missing in user's Supabase schema
      if (error.message.includes('transaction_id') && currentPayload.transaction_id !== undefined) {
        delete currentPayload.transaction_id;
        continue;
      }
      if (error.message.includes('account_id') && currentPayload.account_id !== undefined) {
        delete currentPayload.account_id;
        continue;
      }
      if (error.message.includes('notes') && currentPayload.notes !== undefined) {
        delete currentPayload.notes;
        continue;
      }

      const colMatch = error.message.match(/Could not find the '([^']+)' column/i) ||
                       error.message.match(/column "([^"]+)" of relation/i);
      if (colMatch && colMatch[1] && currentPayload[colMatch[1]] !== undefined) {
        delete currentPayload[colMatch[1]];
        continue;
      }

      break;
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al insertar abono:', error);
      throw error;
    }

    console.log('✅ Abono de deuda registrado con éxito:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] addDebtPayment:', err);
    return null;
  }
};

/**
 * Deletes a debt payment record by ID from debt_payments table.
 * 
 * @param {string} paymentId - Payment record ID
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
export const deleteDebtPayment = async (paymentId) => {
  if (!paymentId) return false;
  console.log('🗑️ [Supabase DB] Eliminando abono de deuda:', paymentId);

  try {
    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar abono:', error);
      return false;
    }

    console.log('✅ Abono eliminado con éxito de Supabase DB:', paymentId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] deleteDebtPayment:', err);
    return false;
  }
};
