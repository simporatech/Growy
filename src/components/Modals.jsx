import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, UserPlus, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { registerUser } from '../utils/userStorage';

export function ForgotPasswordModal({ isOpen, onClose }) {
  const { t } = useSettings();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleReset = (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  };

  const handleClose = () => {
    setSent(false);
    setEmail('');
    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title={sent ? t('modals.auth.linkSentTitle', {}, '¡Enlace Enviado!') : t('modals.auth.forgotModalTitle', {}, 'Recuperar Contraseña')}
      subtitle={sent ? undefined : t('modals.auth.forgotModalSub', {}, 'Ingresa el correo electrónico asociado a tu cuenta de Growy y te enviaremos las instrucciones de recuperación.')}
      icon={sent ? CheckCircle2 : Mail}
      iconBgColor="bg-[#97F2CC]/10"
      iconBorderColor="border-[#97F2CC]/30"
      iconTextColor="text-[#97F2CC]"
    >
      {!sent ? (
        <form onSubmit={handleReset} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
            <FormField
              label={t('modals.auth.email', {}, 'Correo Electrónico')}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          
          <div className="modal-footer sticky bottom-0 z-20 bg-transparent px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0 pb-safe sm:pb-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-save flex-1 py-3 px-4 rounded-xl font-semibold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              {loading ? t('modals.auth.sendingLink', {}, 'Enviando enlace...') : (
                <>
                  <span>{t('modals.auth.sendLink', {}, 'Enviar Enlace de Recuperación')}</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t('modals.auth.linkSentSub', { email }, `Hemos enviado las instrucciones de recuperación a ${email}. Revisa tu bandeja de entrada o spam.`)}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="btn-primary btn-save w-full h-11 px-6 rounded-xl font-semibold text-sm cursor-pointer"
          >
            {t('modals.auth.understood', {}, 'Entendido, Volver')}
          </button>
        </div>
      )}
    </ModalWrapper>
  );
}

export function RegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const { t } = useSettings();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    masterPin: ''
  });
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleClose = () => {
    setRegisteredUser(null);
    setFormData({ fullName: '', username: '', email: '', password: '', confirmPassword: '', masterPin: '' });
    setShowPin(false);
    setShowPassword(false);
    setError('');
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. PIN / Invite Code validation
    const VALID_INVITE_CODES = [
      '667619',
      '667919',
      'GROWY2026',
      import.meta.env.VITE_INVITE_CODE
    ].filter(Boolean);

    const cleanPin = String(formData.masterPin || formData.inviteCode || '').trim();

    if (!VALID_INVITE_CODES.includes(cleanPin)) {
      console.warn('❌ Código de invitación no autorizado:', cleanPin);
      setError(t('modals.auth.invalidMasterPin', {}, 'Invalid authorization code'));
      return;
    }

    if (!formData.username.trim()) {
      setError(t('modals.auth.enterUser', {}, 'Username is required'));
      return;
    }

    // 2. Password policy validation (>= 8 chars, upper, lower, digit/special)
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
    if (!pwdRegex.test(formData.password || '')) {
      setError(t('modals.auth.passwordPolicyError', {}, 'La contraseña debe tener al menos 8 caracteres, mayúscula, minúscula y número/especial'));
      return;
    }

    // 3. Confirm password match validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('modals.auth.passwordMismatch', {}, 'Las contraseñas no coinciden'));
      return;
    }

    try {
      setLoading(true);
      const res = await registerUser({
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        masterPin: cleanPin
      });

      if (res && res.success && res.user) {
        setRegisteredUser(res.user);
        if (onRegisterSuccess) {
          onRegisterSuccess(res.user);
        }
      } else {
        const errKey = res && res.errorKey ? res.errorKey : 'modals.auth.invalidMasterPin';
        setError(t(errKey, {}, 'Invalid authorization code'));
      }
    } catch (err) {
      console.error('Error en registro:', err);
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title={registeredUser ? t('modals.auth.registerSuccessTitle', {}, '¡Cuenta Creada con Éxito!') : t('modals.auth.registerModalTitle', {}, 'Únete a Growy')}
      subtitle={registeredUser ? undefined : t('modals.auth.registerModalSub', {}, 'Crea tu cuenta para tomar el control de tus finanzas personales.')}
      icon={registeredUser ? Sparkles : UserPlus}
      iconBgColor="bg-[#AEEDD0]/10"
      iconBorderColor="border-[#AEEDD0]/30"
      iconTextColor="text-[#AEEDD0]"
      error={error}
    >
      {!registeredUser ? (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
            <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('modals.auth.fullName', {}, 'Nombre Completo')} *
            </label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Tu Nombre"
              className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#AEEDD0] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('modals.auth.username', {}, 'Usuario')} *
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="ej. juanperez"
              className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#AEEDD0] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('modals.auth.email', {}, 'Correo Electrónico')} *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#AEEDD0] transition-colors"
            />
          </div>

          {/* Password Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('modals.auth.password', {}, 'Contraseña')} *
            </label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full h-11 pl-4 pr-11 bg-[#162226] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#AEEDD0] transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-[#AEEDD0]" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('modals.auth.confirmPassword', {}, 'Confirmar Contraseña')} *
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#AEEDD0] transition-colors"
              autoComplete="new-password"
            />
          </div>

          {/* Secure Authorization Code / Master PIN Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-amber-300 block">
              {t('modals.auth.masterPinLabel', {}, 'CÓDIGO DE INVITACIÓN / PIN MAESTRO')} *
            </label>
            <div className="relative group">
              <input
                type={showPin ? "text" : "password"}
                name="masterPin"
                required
                maxLength={10}
                value={formData.masterPin}
                onChange={handleChange}
                placeholder="••••••"
                className={`w-full h-11 pl-4 pr-11 form-input bg-[#121721] border ${error ? 'border-rose-500 bg-rose-500/10' : 'border-amber-500/40 focus:border-amber-400'} rounded-xl text-sm font-bold tracking-widest text-center text-white focus:outline-none transition-all`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                aria-label={showPin ? "Ocultar código" : "Mostrar código"}
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4 text-[#97F2CC]" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <span className="text-[11px] text-slate-300 block">
              {t('modals.auth.masterPinNotice', {}, 'Registro exclusivo con invitación de administrador')}
            </span>
          </div>
          </div>
          <div className="modal-footer sticky bottom-0 z-20 bg-transparent px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0 pb-safe sm:pb-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-save flex-1 py-3 px-4 rounded-xl font-semibold hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <span>{t('modals.auth.validating', {}, 'Procesando...')}</span>
              ) : (
                <>
                  <span>{t('modals.auth.createFreeAccount', {}, 'Crear Cuenta Gratis')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t('modals.auth.registerSuccessSub', { fullName: registeredUser.fullName }, `Bienvenido ${registeredUser.fullName}. Tu cuenta ha sido creada. Ahora puedes iniciar sesión.`)}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="btn-primary btn-save w-full h-11 px-6 rounded-xl font-semibold text-sm cursor-pointer"
          >
            {t('modals.auth.understood', {}, 'Entendido, Volver')}
          </button>
        </div>
      )}
    </ModalWrapper>
  );
}
