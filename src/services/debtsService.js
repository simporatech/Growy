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

/**
 * Records the financial transfer transaction when lending money to someone (is_direct_loan = true, type = 'receivable')
 * Money leaves source_account_id without counting as an operating expense in budgets.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.sourceAccountId
 * @param {number} params.amount
 * @param {string} [params.currency]
 * @param {string} [params.concept]
 * @param {string} [params.startDate]
 * @returns {Promise<Object|null>} Created transaction record
 */
export const recordDirectLoanTransaction = async ({
  userId,
  sourceAccountId,
  amount,
  currency = 'USD',
  concept = '',
  startDate = new Date().toISOString().split('T')[0]
}) => {
  if (!userId || !sourceAccountId || !amount) {
    console.error('❌ Error: userId, sourceAccountId y amount son requeridos para registrar la transacción de préstamo directo.');
    return null;
  }

  const payload = {
    user_id: String(userId),
    account_id: sourceAccountId,
    destination_account_id: null,
    type: 'transfer',
    amount: parseFloat(amount) || 0,
    currency: currency || 'USD',
    exclude_from_budget: true,
    description: `Préstamo otorgado: ${concept || 'Sin concepto'}`.trim(),
    transaction_date: startDate || new Date().toISOString().split('T')[0]
  };

  console.log('🚀 [Supabase DB] Creando transacción por préstamo otorgado:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await supabase.from('transactions').insert([currentPayload]).select();
      data = res.data;
      error = res.error;

      if (!error) break;

      console.warn(`⚠️ [Supabase DB] Error guardando transacción de préstamo (intento ${attempt + 1}):`, error.message);

      if (error.message.includes('exclude_from_budget') && currentPayload.exclude_from_budget !== undefined) {
        delete currentPayload.exclude_from_budget;
        continue;
      }
      break;
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al insertar transacción de préstamo:', error);
      return null;
    }

    console.log('✅ Transacción de préstamo otorgado registrada:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] recordDirectLoanTransaction:', err);
    return null;
  }
};

/**
 * Registers an abono in debt_payments and creates the corresponding financial transaction
 * in transactions table according to debt type:
 * - 'payable' (Deuda por pagar): Creates 'expense' transaction from account_id (reduces balance, records expense).
 * - 'receivable' (Por cobrar): Creates 'transfer' (or income with exclude_from_budget: true) to destination_account_id (increases balance, excluded from budget).
 * 
 * @param {Object} params
 * @param {Object} params.debt - Debt object
 * @param {string} params.userId - User ID
 * @param {number} params.amount - Payment amount
 * @param {string} [params.paymentDate] - Date of payment
 * @param {string} [params.accountId] - Bank account used
 * @param {string} [params.notes] - Optional payment note
 * @returns {Promise<{payment: Object|null, transaction: Object|null, isSettled: boolean}>}
 */
export const recordDebtPaymentWithTransaction = async ({
  debt,
  userId,
  amount,
  paymentDate = new Date().toISOString().split('T')[0],
  accountId = null,
  notes = ''
}) => {
  if (!debt || !userId || !amount) {
    console.error('❌ Error: debt, userId y amount son requeridos.');
    return { payment: null, transaction: null, isSettled: false };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error('❌ Error: Monto inválido para el abono.');
    return { payment: null, transaction: null, isSettled: false };
  }

  const debtType = (debt.type || '').toLowerCase();
  const isPayable = debtType === 'payable' || debtType === 'debt' || !debtType;
  const debtConcept = debt.concept || debt.description || 'Deuda';
  const debtCurrency = debt.currency || 'USD';

  let createdTx = null;

  // 1. Create linked financial transaction if accountId is provided
  if (accountId && isValidUuid(accountId)) {
    try {
      let txPayload = {};

      if (isPayable) {
        // Paying off my debt: Money leaves account (Expense)
        txPayload = {
          user_id: String(userId),
          account_id: accountId,
          destination_account_id: null,
          category_id: isValidUuid(debt.categoryId || debt.category_id) ? (debt.categoryId || debt.category_id) : null,
          type: 'expense',
          amount: numAmount,
          currency: debtCurrency,
          exclude_from_budget: false,
          description: `Abono a deuda: ${debtConcept}`.trim(),
          transaction_date: paymentDate
        };
      } else {
        // Received repayment for money I lent: Money enters account (Transfer / Non-budget inflow)
        txPayload = {
          user_id: String(userId),
          account_id: null,
          destination_account_id: accountId,
          type: 'transfer',
          amount: numAmount,
          currency: debtCurrency,
          exclude_from_budget: true,
          description: `Abono recibido de: ${debtConcept}`.trim(),
          transaction_date: paymentDate
        };
      }

      console.log('🚀 [Supabase DB] Creando transacción vinculada al abono:', txPayload);

      let currentTxPayload = { ...txPayload };
      for (let attempt = 0; attempt < 3; attempt++) {
        const txRes = await supabase.from('transactions').insert([currentTxPayload]).select();
        if (!txRes.error) {
          createdTx = toCamel(txRes.data && txRes.data[0] ? txRes.data[0] : currentTxPayload);
          break;
        }

        console.warn(`⚠️ [Supabase DB] Error guardando transacción de abono (intento ${attempt + 1}):`, txRes.error.message);
        if (txRes.error.message.includes('exclude_from_budget') && currentTxPayload.exclude_from_budget !== undefined) {
          delete currentTxPayload.exclude_from_budget;
          continue;
        }
        if (txRes.error.message.includes('account_id') && currentTxPayload.account_id === null) {
          delete currentTxPayload.account_id;
          continue;
        }
        break;
      }
    } catch (txErr) {
      console.error('❌ Error creando transacción contable para el abono:', txErr);
    }
  }

  // 2. Insert into debt_payments with linked transaction_id
  const paymentRecord = await addDebtPayment({
    debtId: debt.id,
    userId,
    amount: numAmount,
    paymentDate,
    accountId,
    transactionId: createdTx?.id || null,
    notes
  });

  // 3. Fetch all payments to compute new remaining balance and update debt status if settled
  let isSettled = false;
  try {
    const allPayments = await fetchDebtPayments(debt.id);
    const calculations = calculateDebtRemaining(debt, allPayments);
    isSettled = calculations.isSettled;

    if (isSettled && debt.status !== 'paid' && debt.status !== 'settled') {
      console.log('🎉 [Supabase DB] Deuda completamente saldada. Actualizando estado a paid:', debt.id);
      await supabase
        .from('pending_debts')
        .update({ status: 'paid' })
        .eq('id', debt.id);
    }
  } catch (statusErr) {
    console.warn('⚠️ No se pudo verificar/actualizar estado paid de la deuda:', statusErr);
  }

  return {
    payment: paymentRecord,
    transaction: createdTx,
    isSettled
  };
};

/**
 * Deletes a debt payment and automatically deletes the associated transaction (cascade reversion)
 * so that bank account balance immediately restores to its previous state.
 * Also reverts debt status to 'pending' if it was marked as paid.
 * 
 * @param {string} paymentId - ID of payment in debt_payments
 * @param {Object} [cachedPayment] - Optional cached payment record if available
 * @returns {Promise<{success: boolean, deletedTransactionId: string|null, revertedStatus: string|null}>}
 */
export const deleteDebtPaymentWithReversion = async (paymentId, cachedPayment = null) => {
  if (!paymentId) return { success: false, deletedTransactionId: null, revertedStatus: null };
  console.log('🗑️ [Supabase DB] Eliminando abono con reversión contable:', paymentId);

  let targetPayment = cachedPayment;

  // 1. Fetch payment details if not provided to retrieve transaction_id and debt_id
  if (!targetPayment) {
    try {
      const { data } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (data) {
        targetPayment = toCamel(data);
      }
    } catch (fetchErr) {
      console.warn('⚠️ No se pudo obtener detalle previo del abono:', fetchErr);
    }
  }

  const txIdToDelete = targetPayment?.transactionId || targetPayment?.transaction_id;
  const debtId = targetPayment?.debtId || targetPayment?.debt_id;

  // 2. Cascade delete linked transaction if it exists
  let deletedTxId = null;
  if (txIdToDelete && isValidUuid(txIdToDelete)) {
    try {
      console.log('🗑️ [Supabase DB] Eliminando transacción contable asociada:', txIdToDelete);
      const { error: txDelErr } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txIdToDelete);
      if (!txDelErr) {
        deletedTxId = txIdToDelete;
      }
    } catch (txDelEx) {
      console.error('❌ Error eliminando transacción asociada:', txDelEx);
    }
  }

  // 3. Delete debt payment record
  const paymentDeleted = await deleteDebtPayment(paymentId);

  // 4. Check if debt should revert from 'paid' to 'pending'
  let revertedStatus = null;
  if (debtId) {
    try {
      const { data: debtData } = await supabase
        .from('pending_debts')
        .select('*')
        .eq('id', debtId)
        .single();

      if (debtData) {
        const remainingPayments = await fetchDebtPayments(debtId);
        const { isSettled } = calculateDebtRemaining(debtData, remainingPayments);

        if (!isSettled && (debtData.status === 'paid' || debtData.status === 'settled')) {
          console.log('🔄 [Supabase DB] Revirtiendo estado de deuda a pending:', debtId);
          await supabase
            .from('pending_debts')
            .update({ status: 'pending' })
            .eq('id', debtId);
          revertedStatus = 'pending';
        }
      }
    } catch (revertErr) {
      console.warn('⚠️ No se pudo evaluar reversión de estado en deuda:', revertErr);
    }
  }

  return {
    success: paymentDeleted,
    deletedTransactionId: deletedTxId,
    revertedStatus
  };
};

