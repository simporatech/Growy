import { safeGetStorage, safeSetStorage, safeRemoveStorage } from './storage';
import { 
  dbRegisterUser, 
  dbFetchUserByUsername, 
  dbValidateUserLogin, 
  dbUpdateWalkthrough,
  checkUsernameAvailability,
  checkEmailAvailability 
} from '../services/supabaseService';
import { detectUserLocaleAndCurrency } from './currency';
import { detectUserLanguage } from './defaultCategories';

export const VALID_INVITE_CODES = [
  '667619',
  '667919',
  'GROWY2026',
  import.meta.env.VITE_INVITE_CODE
].filter(Boolean);

export const MASTER_PIN = '667919';
export const USERS_KEY = 'growy_users';
export const SESSION_USER_ID_KEY = 'growy_session_user_id';

/**
 * Get active session user ID token from sessionStorage or LocalStorage
 */
export const getActiveSessionUserId = () => {
  try {
    const sessionVal = sessionStorage.getItem(SESSION_USER_ID_KEY);
    if (sessionVal) return sessionVal;
  } catch (e) {}
  return safeGetStorage(SESSION_USER_ID_KEY, null);
};

export const setActiveSessionUserId = (userId, rememberMe = true) => {
  if (!userId) {
    safeRemoveStorage(SESSION_USER_ID_KEY);
    try {
      sessionStorage.removeItem(SESSION_USER_ID_KEY);
    } catch (e) {}
    return;
  }

  if (rememberMe) {
    safeSetStorage(SESSION_USER_ID_KEY, userId);
    try {
      sessionStorage.removeItem(SESSION_USER_ID_KEY);
    } catch (e) {}
  } else {
    try {
      sessionStorage.setItem(SESSION_USER_ID_KEY, userId);
    } catch (e) {}
    safeRemoveStorage(SESSION_USER_ID_KEY);
  }
};

/**
 * Retrieve users array helper for App compatibility
 */
export const getUsers = () => [];

export const markWalkthroughCompleted = async (userId) => {
  console.log('📡 Marking walkthrough completed for user:', userId);
  await dbUpdateWalkthrough(userId);
};

/**
 * Find user by username directly in Supabase PostgreSQL DB (0 local memory fallbacks)
 */
export const findUserByUsername = async (username) => {
  if (!username) return null;
  const clean = username.trim().toLowerCase();

  console.log('📡 Buscando usuario en Supabase DB:', clean);
  return await dbFetchUserByUsername(clean);
};

/**
 * Direct user login querying Supabase users table by username OR email
 */
export const loginUser = async (identifier, password, rememberMe = false) => {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  console.log('🔍 Buscando usuario en Supabase:', cleanId);

  const validatedUser = await dbValidateUserLogin(cleanId, cleanPass);
  if (!validatedUser) {
    throw new Error('INVALID_CREDENTIALS');
  }

  console.log('✅ Sesión iniciada con éxito en Supabase DB:', validatedUser.username);
  setActiveSessionUserId(validatedUser.id, rememberMe);
  return validatedUser;
};

/**
 * Register a new user with master PIN verification (667919) and direct Supabase DB check & insert
 */
export const registerUser = async ({ username, fullName, email, password, masterPin, inviteCode }) => {
  const enteredPin = String(masterPin || inviteCode || '').trim();

  console.log('🔑 Validando código de invitación en registerUser:', enteredPin);

  if (!VALID_INVITE_CODES.includes(enteredPin)) {
    console.error('❌ Master PIN de registro inválido:', enteredPin);
    return { success: false, errorKey: 'modals.auth.invalidMasterPin' };
  }

  const cleanUsername = username ? username.trim().toLowerCase() : email ? email.split('@')[0].toLowerCase() : 'user_' + Date.now();
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  // 1. Verificar disponibilidad de username en tiempo real en Supabase DB (0 coincidencias)
  try {
    const isUsernameAvailable = await checkUsernameAvailability(cleanUsername);
    if (!isUsernameAvailable) {
      console.warn('⚠️ El username ya se encuentra registrado en Supabase DB:', cleanUsername);
      return { success: false, errorKey: 'modals.auth.userExists' };
    }
  } catch (e) {
    console.error('❌ Error al verificar disponibilidad de username:', e);
  }

  // 2. Verificar disponibilidad de email si fue provisto
  if (cleanEmail) {
    try {
      const isEmailAvailable = await checkEmailAvailability(cleanEmail);
      if (!isEmailAvailable) {
        console.warn('⚠️ El email ya se encuentra registrado en Supabase DB:', cleanEmail);
        return { success: false, errorKey: 'modals.auth.userExists' };
      }
    } catch (e) {
      console.error('❌ Error al verificar disponibilidad de email:', e);
    }
  }

  // Detect language & timezone currency automatically
  const userLang = detectUserLanguage();
  const detected = detectUserLocaleAndCurrency();
  const baseCurrency = detected.currency || (userLang === 'es' ? 'HNL' : 'USD');

  console.log('📡 Intentando registrar usuario en Supabase DB:', { username: cleanUsername, fullName, email: cleanEmail, language: userLang, baseCurrency });

  try {
    const dbRes = await dbRegisterUser({ 
      username: cleanUsername, 
      fullName: fullName || cleanUsername, 
      email: cleanEmail,
      password,
      language: userLang,
      baseCurrency
    });

    if (dbRes && dbRes.success && dbRes.user) {
      console.log('✅ Usuario creado con éxito en Supabase DB:', dbRes.user);
      return { success: true, user: dbRes.user };
    } else {
      console.error('❌ Error de Supabase al insertar usuario');
      return { success: false, errorKey: 'modals.auth.invalidMasterPin' };
    }
  } catch (err) {
    console.error('❌ Excepción de Supabase al registrar usuario:', err);
    return { success: false, errorKey: 'modals.auth.invalidMasterPin', error: err };
  }
};
