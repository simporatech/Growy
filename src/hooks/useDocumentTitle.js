import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

const ROUTE_TITLE_KEYS = {
  '/': 'titles.login',
  '/login': 'titles.login',
  'login': 'titles.login',
  '/dashboard': 'titles.dashboard',
  'dashboard': 'titles.dashboard',
  '/transactions': 'titles.transactions',
  'transactions': 'titles.transactions',
  '/accounts': 'titles.accounts',
  'accounts': 'titles.accounts',
  '/debts': 'titles.pending_debts',
  '/pending-debts': 'titles.pending_debts',
  'debts': 'titles.pending_debts',
  'loans': 'titles.pending_debts',
  '/subscriptions': 'titles.subscriptions',
  'subscriptions': 'titles.subscriptions',
  '/categories': 'titles.categories',
  'categories': 'titles.categories',
  '/settings': 'titles.settings',
  'settings': 'titles.settings',
  '/feedback': 'titles.feedback',
  'feedback': 'titles.feedback',
  '/about': 'titles.about',
  'about': 'titles.about',
  '/privacy': 'titles.privacy',
  'privacy': 'titles.privacy',
  '/404': 'titles.not_found',
  '404': 'titles.not_found',
  'not_found': 'titles.not_found'
};

const DEFAULT_FALLBACKS_ES = {
  'titles.login': 'Iniciar Sesión',
  'titles.dashboard': 'Panel Principal',
  'titles.transactions': 'Transacciones',
  'titles.accounts': 'Cuentas',
  'titles.pending_debts': 'Deudas Pendientes',
  'titles.subscriptions': 'Suscripciones',
  'titles.categories': 'Categorías y Presupuestos',
  'titles.settings': 'Ajustes del Sistema',
  'titles.feedback': 'Reportes y Sugerencias',
  'titles.about': 'Acerca de SIMPORA',
  'titles.privacy': 'Política de Privacidad',
  'titles.not_found': '404 - Página No Encontrada'
};

const DEFAULT_FALLBACKS_EN = {
  'titles.login': 'Sign In',
  'titles.dashboard': 'Dashboard',
  'titles.transactions': 'Transactions',
  'titles.accounts': 'Accounts',
  'titles.pending_debts': 'Pending Debts',
  'titles.subscriptions': 'Subscriptions',
  'titles.categories': 'Categories & Budgets',
  'titles.settings': 'System Settings',
  'titles.feedback': 'Reports & Feedback',
  'titles.about': 'About SIMPORA',
  'titles.privacy': 'Privacy Policy',
  'titles.not_found': '404 - Page Not Found'
};

export const useDocumentTitle = (activeView = null) => {
  let t = null;
  let language = 'es';

  try {
    const settings = useSettings();
    t = settings?.t;
    language = settings?.language || 'es';
  } catch (e) {
    // Fail gracefully if called outside provider
  }

  useEffect(() => {
    try {
      let pathOrTab = activeView;
      if (!pathOrTab) {
        if (typeof window !== 'undefined' && window.location) {
          pathOrTab = window.location.pathname || '/';
        } else {
          pathOrTab = '/';
        }
      }

      const titleKey = ROUTE_TITLE_KEYS[pathOrTab] || ROUTE_TITLE_KEYS['/' + pathOrTab] || 'titles.dashboard';
      const fallbacks = language === 'en' ? DEFAULT_FALLBACKS_EN : DEFAULT_FALLBACKS_ES;
      const defaultName = fallbacks[titleKey] || 'Smart Finances';

      const sectionName = (typeof t === 'function')
        ? t(titleKey, {}, defaultName)
        : defaultName;

      document.title = `Growy • ${sectionName}`;
    } catch (err) {
      console.warn('Error setting document title:', err);
      document.title = 'Growy • Smart Finances';
    }
  }, [activeView, language, t]);
};

export default useDocumentTitle;
