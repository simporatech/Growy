import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  FileText, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  KeyRound, 
  EyeOff, 
  Download, 
  Trash2, 
  Cookie,
  Mail,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
  const { t, language } = useSettings();
  const isEs = String(language || 'es').toLowerCase().startsWith('es');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText('https://growy.app/privacy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const sections = [
    {
      id: 'commitment',
      icon: ShieldCheck,
      color: 'text-[var(--accent,#97F2CC)]',
      bg: 'bg-[var(--accent,#97F2CC)]/10',
      title: t('privacy.sections.commitmentTitle', {}, isEs ? '1. Compromiso Fundamental de Privacidad' : '1. Fundamental Privacy Commitment'),
      content: t('privacy.sections.commitmentContent', {}, isEs 
        ? 'En Growy (desarrollado por SIMPORA), creemos firmemente que tus finanzas son estrictamente privadas. No monetizamos tus datos, no mostramos anuncios publicitarios basados en tus movimientos y bajo ninguna circunstancia vendemos, alquilamos ni compartimos tu información financiera o de identidad con terceros, bancos ni corredores de datos.'
        : 'At Growy (developed by SIMPORA), we firmly believe your finances belong strictly to you. We do not monetize your data, we do not serve ads based on your transactions, and we never sell, rent, or share your financial or personal records with third parties, banks, or data brokers.')
    },
    {
      id: 'collection',
      icon: Database,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      title: t('privacy.sections.dataCollectedTitle', {}, isEs ? '2. Información que Procesamos' : '2. Information We Process'),
      content: t('privacy.sections.dataCollectedContent', {}, isEs
        ? 'Únicamente recopilamos los datos que tú decides registrar voluntariamente para hacer funcionar la aplicación: nombre de usuario, correo electrónico, cuentas bancarias registradas, transacciones de gastos e ingresos, metas de ahorro, presupuestos por categoría, saldos pendientes y suscripciones recurrentes.'
        : 'We only process the data you voluntarily provide to power your financial management: username, email address, registered financial accounts, income/expense transactions, savings targets, category budgets, pending debts/loans, and recurring subscriptions.')
    },
    {
      id: 'security',
      icon: Lock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      title: t('privacy.sections.securityTitle', {}, isEs ? '3. Encriptación y Seguridad de Grado Bancario' : '3. Bank-Grade Security & Encryption'),
      content: t('privacy.sections.securityContent', {}, isEs
        ? 'Toda la comunicación entre tu navegador y los servidores de Growy viaja cifrada punto a punto mediante protocolos TLS 1.3 / SSL de 256 bits. La infraestructura de base de datos en Supabase opera bajo estrictas políticas de Row Level Security (RLS), asegurando un aislamiento total entre usuarios: nadie más puede consultar ni alterar tus registros financieros.'
        : 'All data in transit between your browser and Growy servers is encrypted end-to-end using 256-bit TLS 1.3 / SSL protocols. Our Supabase database infrastructure operates under rigorous Row Level Security (RLS) policies, guaranteeing multi-tenant isolation so no other user or external entity can view or modify your financial data.')
    },
    {
      id: 'rights',
      icon: KeyRound,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      title: t('privacy.sections.rightsTitle', {}, isEs ? '4. Soberanía, Exportación y Derecho al Olvido' : '4. Data Sovereignty, Export & Right to be Forgotten'),
      content: t('privacy.sections.rightsContent', {}, isEs
        ? 'Tú tienes la propiedad absoluta de tu información. Puedes exportar en cualquier momento tus registros completos en formatos estándar abiertos (CSV, JSON, PDF) desde los módulos de la plataforma. Asimismo, tienes el derecho pleno a solicitar o ejecutar la eliminación total e irreversible de tu cuenta y todos tus datos financieros.'
        : 'You retain complete ownership of your information. You can export your full records at any time in open standard formats (CSV, JSON, PDF) directly from the application. Furthermore, you have the unrestricted right to permanently delete your account and all associated financial records from our systems.')
    },
    {
      id: 'cookies',
      icon: Cookie,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      title: t('privacy.sections.cookiesTitle', {}, isEs ? '5. Almacenamiento Local y Cookies' : '5. Local Storage & Cookies'),
      content: t('privacy.sections.cookiesContent', {}, isEs
        ? 'Growy no utiliza cookies de seguimiento publicitario ni píxeles de terceros. Empleamos el almacenamiento local de tu navegador (localStorage) únicamente para recordar tus preferencias de experiencia de usuario: idioma preferido (ES/EN), divisa base, estado de la barra lateral y token de autenticación de sesión activa.'
        : 'Growy does not use third-party advertising cookies or tracking pixels. We only utilize your browser local storage (localStorage) strictly to persist your interface preferences: selected language (ES/EN), base currency, collapsed sidebar state, and your active session authentication token.')
    },
    {
      id: 'contact',
      icon: Mail,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      title: t('privacy.sections.contactTitle', {}, isEs ? '6. Contacto y Responsable de Privacidad' : '6. Contact & Data Protection Officer'),
      content: t('privacy.sections.contactContent', {}, isEs
        ? 'El responsable del tratamiento de datos es el estudio de software SIMPORA. Si tienes alguna duda, sugerencia o deseas ejercer tus derechos de privacidad y protección de datos, puedes comunicarte con nuestro equipo a través de la sección de Soporte & Feedback dentro de la app o escribiendo directamente a nuestro canal oficial.'
        : 'The data controller is the SIMPORA software studio. For any questions, feedback, or to exercise your data sovereignty rights, you can contact our engineering team via the Reports & Feedback section in the app or via our official communication channels.')
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity cursor-pointer"
      />

      {/* Modal Card Container */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0D1117] border border-white/10 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden isolate z-10 animate-scaleUp">
        
        {/* Glow ambient header decoration */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-[var(--accent,#97F2CC)]/10 blur-3xl pointer-events-none -z-10 rounded-full" />

        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0 bg-[#0D1117]/90 backdrop-blur-xl">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent,#97F2CC)]/10 border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 shadow-lg shadow-[var(--accent,#97F2CC)]/5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug truncate">
                {t('privacy.modalTitle', {}, isEs ? 'Política de Privacidad y Seguridad' : 'Privacy Policy & Data Security')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-normal">
                {t('privacy.modalSubtitle', {}, isEs ? 'Transparencia absoluta, encriptación bancaria y soberanía total sobre tu información' : 'Absolute transparency, bank-grade encryption, and full sovereignty')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title={t('privacy.close', {}, isEs ? 'Cerrar' : 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SECURITY HIGHLIGHT BADGES BAR */}
        <div className="px-5 sm:px-6 py-3 bg-[#090C10]/70 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent,#97F2CC)]/10 border border-[var(--accent,#97F2CC)]/25 text-[var(--accent,#97F2CC)] font-semibold text-[11px]">
              <Lock className="w-3 h-3" />
              <span>{t('privacy.badgeEncrypted', {}, isEs ? 'Cifrado TLS 1.3 / SSL 256-bit' : 'TLS 1.3 / SSL 256-bit')}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold text-[11px]">
              <EyeOff className="w-3 h-3" />
              <span>{t('privacy.badgeNoSale', {}, isEs ? 'Cero Venta de Datos' : 'Zero Data Selling')}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 font-semibold text-[11px]">
              <Database className="w-3 h-3" />
              <span>{t('privacy.badgeRls', {}, isEs ? 'Aislamiento Supabase RLS' : 'Supabase RLS Isolation')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Copiar enlace"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isEs ? '¡Copiado!' : 'Copied!') : (isEs ? 'Compartir enlace' : 'Share link')}</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE POLICY SECTIONS) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[60vh] text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400">
            <p>
              <strong className="text-white font-semibold">{t('privacy.lastUpdated', {}, isEs ? 'Última actualización: Septiembre 2026' : 'Last updated: September 2026')}</strong> • Growy es desarrollado y operado por <strong className="text-white font-semibold">SIMPORA</strong>. Este documento describe con claridad y transparencia cómo protegemos tu información.
            </p>
          </div>

          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div 
                key={sec.id}
                className="p-4 rounded-2xl bg-[#090C10]/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${sec.bg} ${sec.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {sec.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal pl-9">
                  {sec.content}
                </p>
              </div>
            );
          })}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0D1117] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400 font-medium">
            SIMPORA Software &copy; {new Date().getFullYear()}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-xl bg-[var(--accent,#97F2CC)] text-black font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-[var(--accent,#97F2CC)]/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isEs ? 'Entendido y Aceptar' : 'Acknowledge & Close'}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
