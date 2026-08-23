import React, { useState, useEffect } from 'react';
import LoginCard from './components/LoginCard';
import DashboardPreview from './components/DashboardPreview';
import WalkthroughModal from './components/WalkthroughModal';
import { ForgotPasswordModal, RegisterModal } from './components/Modals';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FinanceProvider } from './context/FinanceContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { markWalkthroughCompleted, getActiveSessionUserId, setActiveSessionUserId } from './utils/userStorage';
import { dbFetchUserById } from './services/supabaseService';
import { ShieldCheck } from 'lucide-react';
import DbConnectionGuard from './components/DbConnectionGuard';
import { useDocumentTitle } from './hooks/useDocumentTitle';

function LoginScreen({ onLoginSuccess, onOpenForgotPassword, onOpenRegister }) {
  const { t } = useSettings();
  useDocumentTitle('login');

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#090C10] relative flex flex-col justify-between selection:bg-[var(--color-primary,#97F2CC)] selection:text-[#091E15]">
      
      {/* BACKGROUND GRAPHICS (Ambient Glow Blobs with Texture) */}
      <div 
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-[150px] opacity-40 transition-colors duration-500 pointer-events-none"
        style={{ backgroundColor: 'var(--color-glow, rgba(151, 242, 204, 0.12))' }}
      />
      <div 
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[180px] opacity-30 transition-colors duration-500 pointer-events-none"
        style={{ backgroundColor: 'var(--color-glow, rgba(151, 242, 204, 0.08))' }}
      />

      {/* TOP DECORATIVE HEADER */}
      <header className="relative z-10 p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-center p-2 shadow-lg">
            <img src="/logos/Transparent.svg" alt="Growy" className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-black tracking-wider text-white">GROWY</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary,#AEEDD0)]" />
          <span className="text-[11px] font-semibold text-slate-300">
            {t('modals.auth.encryptedConnection', {}, 'Conexión Encriptada 256-bit')}
          </span>
        </div>
      </header>

      {/* LOGIN CARD CENTERED CONTAINER */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <LoginCard 
          onLoginSuccess={onLoginSuccess}
          onOpenForgotPassword={onOpenForgotPassword}
          onOpenRegister={onOpenRegister}
        />
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 mt-8 pb-4 flex flex-col items-center gap-1">
        <p className="text-xs text-slate-400 font-medium">
          Growy &copy; {new Date().getFullYear()}
        </p>
        <p className="text-xs text-slate-500 font-medium">
          {t('common.footerTagline', {}, 'Ecosistema de Finanzas Personales Inteligentes')}
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Auto session restoration on reload (F5) with live Supabase DB user validation
  useEffect(() => {
    async function initSession() {
      const storedId = getActiveSessionUserId();
      if (!storedId) {
        setUser(null);
        return;
      }

      console.log('🔄 Sincronizando sesión desde Supabase DB para:', storedId);

      // Validate that user STILL EXISTS in Supabase DB
      const liveUser = await dbFetchUserById(storedId);

      if (!liveUser) {
        console.warn('⚠️ La sesión guardada pertenece a un usuario eliminado en Supabase DB. Purgando sesión.');
        setActiveSessionUserId(null);
        setUser(null);
        return;
      }

      setUser(liveUser);
      if (!liveUser.hasCompletedWalkthrough) {
        setShowWalkthrough(true);
      }
    }
    initSession();
  }, []);

  const handleLoginSuccess = (loggedUser) => {
    setUser(loggedUser);
    if (!loggedUser.hasCompletedWalkthrough) {
      setShowWalkthrough(true);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión y purgando identificadores...');
    setActiveSessionUserId(null);
    setUser(null);
    setShowWalkthrough(false);
  };

  const handleCompleteWalkthrough = () => {
    if (user && user.id) {
      markWalkthroughCompleted(user.id);
    }
    setUser(prev => prev ? { ...prev, hasCompletedWalkthrough: true } : null);
    setShowWalkthrough(false);
  };

  return (
    <ErrorBoundary>
      <DbConnectionGuard>
        <SettingsProvider userId={user?.id || getActiveSessionUserId()}>
          {user ? (
            <FinanceProvider userId={user.id}>
              <div className="h-screen w-screen overflow-hidden bg-[#090C10] selection:bg-[var(--color-primary,#97F2CC)] selection:text-[#091E15]">
                <DashboardPreview user={user} onLogout={handleLogout} />
                <WalkthroughModal
                  isOpen={showWalkthrough}
                  onComplete={handleCompleteWalkthrough}
                />
              </div>
            </FinanceProvider>
          ) : (
            <>
              <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
                onOpenRegister={() => setIsRegisterOpen(true)}
              />
              <ForgotPasswordModal
                isOpen={isForgotPasswordOpen}
                onClose={() => setIsForgotPasswordOpen(false)}
              />
              <RegisterModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onRegisterSuccess={(newUser) => {
                  handleLoginSuccess(newUser);
                }}
              />
            </>
          )}
        </SettingsProvider>
      </DbConnectionGuard>
    </ErrorBoundary>
  );
}
