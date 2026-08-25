import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, Wallet, PieChart, Globe, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import Button from './Button';
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
      iconColor: 'text-[var(--accent,#97F2CC)]',
      iconBg: 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] border-[var(--accent,#97F2CC)]/30',
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      
      <div 
        role="dialog"
        aria-modal="true"
        className="modal-container w-full max-w-md p-6 sm:p-7 rounded-3xl bg-[#0A0D14] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden space-y-6"
      >
        
        {/* Top Header: Step Counter & Skip Link */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)]" />
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
            <span className="text-xs font-semibold text-[var(--accent,#97F2CC)] block uppercase tracking-wider">
              {stepData.subtitle}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {stepData.desc}
          </p>
        </div>

        {/* Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentStep === idx 
                  ? 'w-6 bg-[var(--accent,#97F2CC)]' 
                  : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              title={`Paso ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Controls Footer */}
        <div className="modal-footer flex items-center gap-3 pt-2">
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={ChevronLeft}
              onClick={handlePrev}
            >
              {t('walkthrough.prev', {}, 'Anterior')}
            </Button>
          ) : <div className="flex-1" />}

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            className="flex-1"
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
          </Button>
        </div>

      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}
