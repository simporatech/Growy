import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

import { setActiveSessionUserId } from '../utils/userStorage';
import { dbValidateUserLogin } from '../services/supabaseService';

export default function LoginCard({ onLoginSuccess, onOpenForgotPassword, onOpenRegister }) {
  const { t } = useSettings();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      triggerError(t('modals.auth.enterUser', {}, 'El campo de usuario no puede estar vacío.'));
      return;
    }
    if (!cleanPass) {
      triggerError(t('modals.auth.enterPass', {}, 'Por favor, ingresa tu contraseña.'));
      return;
    }

    setIsLoading(true);

    try {
      const validatedUser = await dbValidateUserLogin(cleanUser, cleanPass);
      setIsLoading(false);

      if (validatedUser) {
        setActiveSessionUserId(validatedUser.id, rememberMe);
        onLoginSuccess(validatedUser);
      } else {
        triggerError(t('modals.auth.invalidCredentials', {}, 'Usuario o contraseña incorrectos.'));
      }
    } catch (err) {
      setIsLoading(false);
      triggerError(t('modals.auth.invalidCredentials', {}, 'Usuario o contraseña incorrectos.'));
    }
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className={`w-full max-w-md mx-auto transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
      {/* Glassmorphism Card Container */}
      <div className="growy-glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Ambient interior glow highlights */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#AEEDD0]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#AEEDD0]/5 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Header: Logo & Branding */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="relative group mb-4">
            <div className="absolute inset-0 bg-[#AEEDD0]/20 rounded-full blur-xl group-hover:bg-[#AEEDD0]/35 transition-all duration-500 scale-110" />
            <div className="relative bg-[#1E2D32]/80 border border-[#AEEDD0]/25 rounded-2xl p-3.5 shadow-lg flex items-center justify-center">
              <img 
                src="/logos/Transparent.svg" 
                alt="Growy Logo" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-[0_4px_12px_rgba(174,237,208,0.3)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Growy
          </h1>
          <p className="text-[#8EA7A8] text-xs sm:text-sm mt-1.5 font-medium">
            {t('modals.auth.loginSubtitle', {}, 'Gestión financiera inteligente')}
          </p>
        </div>

        {/* 2. Login Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 sm:space-y-5 relative z-10">
          
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-rose-200 text-xs sm:text-sm backdrop-blur-md transition-all duration-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMsg}
              </div>
            </div>
          )}

          {/* Username Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#8EA7A8] uppercase tracking-wider pl-1">
              {t('modals.auth.username', {}, 'Usuario')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA7A8] group-focus-within:text-[#AEEDD0] transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder={t('modals.auth.usernamePlaceholder', {}, 'Ingresa tu usuario')}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl growy-glass-input text-sm placeholder-[#8EA7A8]/50"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#8EA7A8] uppercase tracking-wider pl-1">
              {t('modals.auth.password', {}, 'Contraseña')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA7A8] group-focus-within:text-[#AEEDD0] transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl growy-glass-input text-sm placeholder-[#8EA7A8]/50"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8EA7A8] hover:text-white transition-colors focus:outline-none"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-[#AEEDD0]" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Options: Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[#8EA7A8] hover:text-white transition-colors select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#AEEDD0]/30 bg-[#1E2D32] text-[#AEEDD0] focus:ring-[#AEEDD0]/50 accent-[#AEEDD0]"
              />
              <span>{t('modals.auth.rememberMe', {}, 'Recordarme')}</span>
            </label>

            <button
              type="button"
              onClick={onOpenForgotPassword}
              className="text-[#8EA7A8] hover:text-[#AEEDD0] transition-colors font-medium hover:underline underline-offset-4"
            >
              {t('modals.auth.forgotPassword', {}, '¿Olvidaste tu contraseña?')}
            </button>
          </div>

          {/* Main Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl btn-primary-mint font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
          >
            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <svg className="animate-spin h-5 w-5 text-[#1E2D32]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('modals.auth.validating', {}, 'Validando sesión...')}</span>
              </div>
            ) : (
              <>
                <span>{t('modals.auth.loginBtn', {}, 'Iniciar Sesión')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* 3. Footer: Register prompt */}
        <div className="mt-6 text-center text-xs text-[#8EA7A8] relative z-10">
          {t('modals.auth.noAccountPrompt', {}, '¿Aún no tienes una cuenta?')}{' '}
          <button
            type="button"
            onClick={onOpenRegister}
            className="text-[#AEEDD0] font-bold hover:underline underline-offset-4 ml-1 transition-colors"
          >
            {t('modals.auth.createAccount', {}, 'Crear cuenta')}
          </button>
        </div>

      </div>
    </div>
  );
}
