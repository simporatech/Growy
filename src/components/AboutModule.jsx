import React from 'react';
import { Sparkles, Mail, Phone, Coffee, ExternalLink, ShieldCheck, Heart, Smartphone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function AboutModule() {
  const { t } = useSettings();

  const paypalEmail = 'contact.simpora@gmail.com';
  const paypalTransferUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${paypalEmail}&currency_code=USD&item_name=Regalame%20un%20cafe`;
  const whatsappUrl = 'https://wa.me/50498700953';
  const contactEmail = 'simporatech@gmail.com';

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-8">
      
      {/* Standardized View Header */}
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {t('about.title', {}, 'Acerca de SIMPORA')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-normal mt-0.5">
            {t('about.subtitle', {}, 'Conoce al equipo detrás del ecosistema Growy')}
          </p>
        </div>
      </header>

      {/* Main Brand Banner Deep Glassmorphism */}
      <div className="w-full p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        
        {/* Isotipo SIMPORA in w-20 h-20 box */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2.5 sm:p-3 shrink-0 group hover:scale-105 transition-transform duration-300">
          <img 
            src="/logos/simpora_isotype.png" 
            alt="SIMPORA" 
            className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(174,237,208,0.3)]" 
          />
        </div>

        <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 text-[var(--color-primary,#AEEDD0)] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('about.developerBadge', {}, 'Desarrollador Oficial')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            SIMPORA
          </h2>

          {/* Slogan reactive i18n */}
          <h3 className="text-base sm:text-lg font-bold text-[#AEEDD0] tracking-wide mt-1">
            {t('about.tagline', {}, 'Simple. Poderosa. Avanzada.')}
          </h3>

          <p className="text-sm text-slate-300 font-normal leading-relaxed max-w-2xl mt-1">
            {t('about.description', {}, 'SIMPORA es un estudio de software enfocado en construir herramientas tecnológicas simples, potentes y extraordinariamente intuitivas para transformar la gestión personal y empresarial.')}
          </p>
        </div>

      </div>

      {/* Contact & Support Grid (2 Columns items-stretch Deep Glassmorphism) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5 items-stretch relative z-10">
        
        {/* Column 1: Direct Channels */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('about.directChannels', {}, 'Canales de Contacto Directo')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('about.directChannelsSub', {}, 'Soporte, desarrollo a medida y consultas directas')}</p>
              </div>
            </div>

            {/* WhatsApp Link (+504 9870-0953) */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-16 px-4 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-between hover:border-emerald-500/40 hover:bg-emerald-500/[0.05] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-semibold uppercase block">{t('about.phone', {}, 'Teléfono / WhatsApp')}</span>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors tabular-nums">
                    +504 9870-0953
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-300 transition-colors" />
            </a>

            {/* Email Link (simporatech@gmail.com) */}
            <a
              href={`mailto:${contactEmail}`}
              className="h-16 px-4 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-between hover:border-sky-500/40 hover:bg-sky-500/[0.05] transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs text-slate-300 font-semibold uppercase block">{t('about.email', {}, 'Correo Electrónico')}</span>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    {contactEmail}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-300 transition-colors" />
            </a>
          </div>

          <div className="p-4 rounded-2xl bg-[#162226] border border-white/10 text-xs text-slate-300 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#AEEDD0] shrink-0" />
            <span>{t('about.badgeLocation', {}, 'Desarrollo de Software & Soluciones Inteligentes en Honduras.')}</span>
          </div>
        </div>

        {/* Column 2: Buy me a coffee / PayPal Transfer (Estructura con Aire y Respiro Visual) */}
        <div className="p-7 md:p-8 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('about.coffeeTitle', {}, 'Regálame un café ☕')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('about.coffeeSub', {}, 'Apoya el desarrollo continuo de Growy')}</p>
              </div>
            </div>

            {/* Párrafo descriptivo */}
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {t('about.coffeeDesc', {}, 'Si Growy te ayuda a ordenar tus finanzas diarias, puedes apoyar al creador enviando un aporte voluntario directo por PayPal.')}
            </p>

            {/* Caja de Contribución Directa */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 my-4 space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-amber-300" />
                <span>{t('about.paypalNoticeTitle', {}, 'Contribución Directa por PayPal')}</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {t('about.paypalNoticeDesc', { email: paypalEmail }, `Envía tu transferencia a ${paypalEmail}`)}
              </p>
            </div>
          </div>

          {/* Botón de Enlace PayPal */}
          <div className="pt-2">
            <a
              href={paypalTransferUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 w-full bg-[#AEEDD0] text-[#1E2D32] font-bold text-sm px-6 rounded-xl flex items-center justify-center gap-3 hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10"
            >
              <Coffee className="w-4 h-4 stroke-[2.5]" />
              <span>{t('about.coffeeBtn', {}, 'Enviar aporte por PayPal')}</span>
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
            </a>
          </div>

        </div>

      </div>

    </div>
  );
}
