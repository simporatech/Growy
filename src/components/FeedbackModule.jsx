import React, { useState } from 'react';
import { MessageSquarePlus, Send, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Clock, Mail, Phone, ExternalLink } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { useSettings } from '../context/SettingsContext';
import { dbSubmitFeedback } from '../services/supabaseService';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xppakyed';

export default function FeedbackModule() {
  const { t } = useSettings();

  const [type, setType] = useState('suggestion'); // 'suggestion' | 'bug' | 'feature'
  const [priority, setPriority] = useState('medium'); // 'low' | 'medium' | 'high'
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const typeOptions = [
    { value: 'suggestion', label: t('feedback.types.suggestion', {}, '💡 Sugerencia de mejora') },
    { value: 'bug', label: t('feedback.types.bug', {}, '🐛 Reporte de error (Bug)') },
    { value: 'feature', label: t('feedback.types.feature', {}, '✨ Solicitud de nueva función') }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setIsSuccess(false);
    setIsError(false);

    try {
      // Submit to Supabase DB feedback table
      await dbSubmitFeedback({
        type,
        priority,
        subject: subject.trim(),
        message: description.trim()
      });

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type,
          priority,
          subject: subject.trim(),
          message: description.trim(),
          _replyto: 'simporatech@gmail.com'
        })
      });

      if (response.ok) {
        setIsSuccess(true);
        setSubject('');
        setDescription('');
      } else {
        setIsSuccess(true); // Still mark success if Supabase succeeded
        setSubject('');
        setDescription('');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-8">
      
      {/* Standardized View Header */}
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {t('feedback.title', {}, 'Reportes y Feedback')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-normal mt-0.5">
            {t('feedback.subtitle', {}, 'Envía sugerencias, reporta errores o solicita funciones')}
          </p>
        </div>
      </header>

      {/* Symmetrical 2-Column Grid (items-stretch 2/3 Form + 1/3 Support Info & SLA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-5 items-stretch relative z-10">
        
        {/* Left Column (2/3 Width - Form Card) */}
        <div className="lg:col-span-2 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl space-y-4 sm:space-y-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          
          <div className="flex items-center gap-3 border-b border-white/5 pb-3 sm:pb-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#AEEDD0]/15 border border-[#AEEDD0]/30 flex items-center justify-center text-[#AEEDD0] shrink-0 font-bold">
              <MessageSquarePlus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('feedback.title', {}, 'Reportes y Feedback')}</h3>
              <p className="text-xs text-slate-300 font-medium">{t('feedback.subtitle', {}, 'Envía sugerencias, reporta errores o solicita nuevas funciones')}</p>
            </div>
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fadeIn flex items-start gap-3 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-white">
                  {t('feedback.successMsg', {}, '¡Reporte enviado con éxito! Gracias por tus comentarios.')}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {isError && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold animate-fadeIn flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {t('feedback.errorMsg', {}, 'Ocurrió un error al enviar el reporte. Por favor intenta de nuevo.')}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Type Selector & Priority Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
                  {t('feedback.typeLabel', {}, 'Tipo de reporte')}
                </label>
                <CustomSelect
                  options={typeOptions}
                  value={type}
                  onChange={setType}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
                  {t('feedback.priorityLabel', {}, 'Prioridad')}
                </label>
                <div className="flex items-center gap-2 h-11">
                  {[
                    { id: 'low', label: t('feedback.priorities.low', {}, 'Baja'), color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' },
                    { id: 'medium', label: t('feedback.priorities.medium', {}, 'Media'), color: 'bg-amber-500/20 border-amber-500/30 text-amber-300' },
                    { id: 'high', label: t('feedback.priorities.high', {}, 'Alta'), color: 'bg-rose-500/20 border-rose-500/30 text-rose-300' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setPriority(p.id)}
                      className={`flex-1 h-full rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        priority === p.id ? `${p.color} shadow-sm scale-[1.02]` : 'bg-[#162226] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject Input (h-11) */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
                {t('feedback.subjectLabel', {}, 'Asunto o título breve')}
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('feedback.subjectPlaceholder', {}, 'Ej. Error al registrar cuenta, sugerencia para gráficos...')}
                className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[#AEEDD0] disabled:opacity-50 transition-all"
              />
            </div>

            {/* Description Textarea */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
                {t('feedback.descLabel', {}, 'Descripción detallada')}
              </label>
              <textarea
                required
                rows={5}
                disabled={isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('feedback.descPlaceholder', {}, 'Describe con el mayor detalle posible lo ocurrido o tu propuesta...')}
                className="w-full p-3.5 bg-[#162226] border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[#AEEDD0] resize-none disabled:opacity-50 transition-all"
              />
            </div>

            {/* Submit Button (h-11) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 bg-[#AEEDD0] text-[#1E2D32] font-bold text-sm rounded-xl hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center justify-center gap-2 cursor-pointer w-full disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1E2D32]" />
                    <span>{t('feedback.sending', {}, 'Enviando reporte...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('feedback.sendBtn', {}, 'Enviar Reporte')}</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Right Column (1/3 Width - Support Info & SLA Card) */}
        <div className="lg:col-span-1 p-7 md:p-8 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl space-y-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col justify-between h-full">
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('feedback.supportGuarantee', {}, 'Garantía de Soporte')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('feedback.supportTeam', {}, 'Equipo Técnico SIMPORA')}</p>
              </div>
            </div>

            {/* SLA Badge */}
            <div className="p-4 rounded-xl bg-[#162226] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{t('feedback.slaTitle', {}, 'Tiempo de Respuesta SLA')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {t('feedback.slaDesc', {}, 'Revisamos minuciosamente cada reporte. Recibirás una respuesta en tu correo en menos de 24 horas hábiles.')}
              </p>
            </div>

            {/* Direct Channels */}
            <div className="space-y-2 pt-1">
              <a
                href="mailto:simporatech@gmail.com"
                className="p-3 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between hover:border-sky-500/40 hover:bg-sky-500/[0.05] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-slate-300 font-semibold uppercase block">{t('feedback.directEmail', {}, 'Correo Directo')}</span>
                    <span className="text-xs font-bold text-white truncate block group-hover:text-sky-300">
                      simporatech@gmail.com
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300" />
              </a>

              <a
                href="https://wa.me/50498700953"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between hover:border-emerald-500/40 hover:bg-emerald-500/[0.05] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-slate-300 font-semibold uppercase block">{t('feedback.directWhatsapp', {}, 'WhatsApp Directo')}</span>
                    <span className="text-xs font-bold text-white truncate block group-hover:text-emerald-300 tabular-nums">
                      +504 9870-0953
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300" />
              </a>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#162226] border border-white/10 text-xs text-slate-300 font-medium text-center">
            Growy Web App • <strong className="text-white">v1.0 Pro</strong>
          </div>

        </div>

      </div>

    </div>
  );
}
