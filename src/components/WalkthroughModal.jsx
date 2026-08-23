import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, Wallet, PieChart, Globe, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { registerModal } from '../utils/modalManager';

export default function WalkthroughModal({ isOpen, onComplete }) {
  const { t } = useSettings();
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerModal();
    return () => {
      unregister();
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const steps = [
    {
      icon: Rocket,
      iconColor: 'text-[#AEEDD0]',
      iconBg: 'bg-[#AEEDD0]/15 border-[#AEEDD0]/30',
      title: t('walkthrough.step1Title', {}, 'Bienvenida a Growy 🚀'),
      subtitle: t('walkthrough.step1Sub', {}, 'Filosofía de finanzas inteligentes y gestión limpia'),
      desc: t('walkthrough.step1Desc', {}, 'Growy te permite tomar el control absoluto de tus cuentas, presupuestos y patrimonio neto de forma intuitiva, privada y en tiempo real.')
    },
    {
      icon: Wallet,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30',
      title: t('walkthrough.step2Title', {}, 'Agrega tu Primera Cuenta 💳'),
      subtitle: t('walkthrough.step2Sub', {}, 'Efectivo, bancos y billeteras digitales'),
      desc: t('walkthrough.step2Desc', {}, 'Comienza registrando tus cuentas principales (Efectivo, Banco, Ahorros). Cada cuenta mantiene su propia divisa y saldo independiente.')
    },
    {
      icon: PieChart,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      title: t('walkthrough.step3Title', {}, 'Registra Movimientos y Presupuestos 📊'),
      subtitle: t('walkthrough.step3Sub', {}, 'Límites de gastos y metas de ingresos'),
      desc: t('walkthrough.step3Desc', {}, 'Crea categorías para organizar tus compras y establecer límites mensuales. Monitorea tus presupuestos de gasto y metas de recaudación.')
    },
    {
      icon: Globe,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
      title: t('walkthrough.step4Title', {}, 'Moneda y Personalización ⚙️'),
      subtitle: t('walkthrough.step4Sub', {}, 'Divisa base, temas y desenfoque'),
      desc: t('walkthrough.step4Desc', {}, 'Configura tu moneda global (USD, HNL, EUR, MXN, GTQ, COP), cambia la paleta de colores y ajusta el nivel de desenfoque a tu gusto.')
    }
  ];

  const stepData = steps[currentStep];
  const StepIcon = stepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Centered Glassmorphism Container */}
      <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#1E2D32]/95 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
        
        {/* Top Header: Step Counter & Skip Link */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[#AEEDD0]" />
            <span>{t('walkthrough.stepOf', { current: currentStep + 1, total: steps.length }, `Paso ${currentStep + 1} de ${steps.length}`)}</span>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {t('walkthrough.skip', {}, 'Saltar Tour')}
          </button>
        </div>

        {/* Step Visual Tile */}
        <div className="space-y-4 text-center py-2">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-lg ${stepData.iconBg}`}>
            <StepIcon className={`w-8 h-8 ${stepData.iconColor}`} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              {stepData.title}
            </h3>
            <span className="text-xs font-semibold text-[#AEEDD0] block uppercase tracking-wider">
              {stepData.subtitle}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xs mx-auto">
            {stepData.desc}
          </p>
        </div>

        {/* Dots Progress Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-8 bg-[#AEEDD0]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center gap-3 pt-2">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t('walkthrough.prev', {}, 'Anterior')}</span>
            </button>
          ) : <div className="flex-1" />}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-11 px-5 rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] font-bold text-xs shadow-md shadow-[#AEEDD0]/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{t('walkthrough.startBtn', {}, '¡Comenzar Ahora!')}</span>
              </>
            ) : (
              <>
                <span>{t('walkthrough.next', {}, 'Siguiente')}</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}
