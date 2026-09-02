import React from 'react';
import { AlertCircle, RotateCcw, LogOut } from 'lucide-react';
import Button from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 Error capturado por ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Obtener idioma preferido dinámicamente desde el storage del navegador
      const lang = (
        localStorage.getItem('growy_lang') ||
        localStorage.getItem('growy_language_preference') || 
        localStorage.getItem('growy_language') || 
        (navigator.language || 'es')
      ).toLowerCase();

      const isEs = lang.startsWith('es');

      const texts = {
        title: isEs ? "¡Uy! Ocurrió un problema inesperado" : "Oops! An unexpected error occurred",
        subtitle: isEs 
          ? "Detectamos un inconveniente al cargar el módulo. Puedes intentar restaurar la vista o reiniciar la sesión." 
          : "We encountered an issue loading this module. You can try refreshing the view or resetting the session.",
        retry: isEs ? "Reintentar" : "Retry",
        reset: isEs ? "Restablecer Sesión" : "Reset Session"
      };

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0E1517] p-6 selection:bg-[var(--accent,#97F2CC)] selection:text-[var(--accent-text,#091E15)]">
          <div className="w-full max-w-md p-8 bg-[#131E22]/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
              <AlertCircle size={28} />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{texts.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{texts.subtitle}</p>

            {this.state.error && (
              <div className="w-full text-left p-3 mb-6 bg-black/40 border border-rose-500/20 rounded-xl overflow-hidden text-[11px] font-mono text-rose-300 max-h-36 overflow-y-auto custom-scrollbar select-text">
                <p className="font-bold text-rose-400">{String(this.state.error?.message || this.state.error)}</p>
                {this.state.error?.stack && (
                  <pre className="text-[10px] text-slate-400 mt-1 whitespace-pre-wrap leading-tight">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="w-full flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={RotateCcw}
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1"
              >
                <span>{texts.retry}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={LogOut}
                onClick={this.handleReset}
                className="flex-1"
              >
                <span>{texts.reset}</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
