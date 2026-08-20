export const DEFAULT_CATEGORIES = {
  en: [
    { name: 'Food & Dining', type: 'expense', emoji: '🍔', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Transportation', type: 'expense', emoji: '🚗', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Bills & Utilities', type: 'expense', emoji: '💡', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Entertainment', type: 'expense', emoji: '🍿', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Salary', type: 'income', emoji: '💼', color: '#AEEDD0', targetAmount: 0 },
    { name: 'Freelance / Projects', type: 'income', emoji: '🚀', color: '#AEEDD0', targetAmount: 0 }
  ],
  es: [
    { name: 'Alimentación', type: 'expense', emoji: '🍔', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Transporte', type: 'expense', emoji: '🚗', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Servicios & Hogar', type: 'expense', emoji: '💡', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Entretenimiento', type: 'expense', emoji: '🍿', color: '#FF6B6B', targetAmount: 0 },
    { name: 'Salario', type: 'income', emoji: '💼', color: '#AEEDD0', targetAmount: 0 },
    { name: 'Proyectos / Freelance', type: 'income', emoji: '🚀', color: '#AEEDD0', targetAmount: 0 }
  ]
};

export const SEED_CATEGORIES = DEFAULT_CATEGORIES;

export const detectUserLanguage = () => {
  const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || 'en').toLowerCase();
  return browserLang.startsWith('es') ? 'es' : 'en';
};
