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

function LoginScreen({ onLoginSuccess, onOpenForgotPassword, onOpenRegister }) {
  const { t } = useSettings();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0F11] relative flex flex-col justify-between selection:bg-[var(--color-primary,#AEEDD0)] selection:text-[#1E2D32]">
      
      {/* BACKGROUND GRAPHICS (Ambient Glow Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--color-primary,#AEEDD0)]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#3B82F6]/10 rounded-full blur-[140px] pointer-events-none" />

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
      <footer className="relative z-10 p-4 text-center">
        <p className="text-xs text-slate-300 font-medium">
          Growy &copy; {new Date().getFullYear()} • Smart Personal Finance Ecosystem
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

  if (user) {
    return (
      <ErrorBoundary>
        <DbConnectionGuard>
          <SettingsProvider>
            <FinanceProvider userId={user.id}>
              <div className="h-screen w-screen overflow-hidden bg-[var(--bg-base,#1E2D32)] selection:bg-[var(--color-primary,#AEEDD0)] selection:text-[#1E2D32]">
                <DashboardPreview user={user} onLogout={handleLogout} />
                <WalkthroughModal
                  isOpen={showWalkthrough}
                  onComplete={handleCompleteWalkthrough}
                />
              </div>
            </FinanceProvider>
          </SettingsProvider>
        </DbConnectionGuard>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <DbConnectionGuard>
        <SettingsProvider>
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
        </SettingsProvider>
      </DbConnectionGuard>
    </ErrorBoundary>
  );
}
