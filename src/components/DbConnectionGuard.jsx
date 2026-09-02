import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabaseClient';

export default function DbConnectionGuard({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Lightweight ping check to Supabase DB
      const { data, error } = await supabase
        .from('exchange_rates_cache')
        .select('id')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Ping de conexión a Supabase falló:', error);
        setIsConnected(false);
        setErrorMessage(error.message || 'No se pudo conectar a la base de datos de Supabase.');
      } else {
        setIsConnected(true);
        setErrorMessage('');
      }
    } catch (err) {
      console.error('❌ Excepción de conexión a Supabase:', err);
      setIsConnected(false);
      setErrorMessage(err.message || 'Error de red o conexión rehusada al servidor Supabase.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  if (!isConnected && !isChecking) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-[#090C10]/95 backdrop-blur-2xl text-white animate-fadeIn">
        <div className="max-w-md w-full p-8 text-center bg-[#0F141C] border border-rose-500/30 rounded-3xl shadow-2xl space-y-4">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-3xl">
            📡⚡
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Error de Conexión con el Servidor</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            No se pudo establecer comunicación con la base de datos principal de Supabase. Verifica tu conexión a internet o el estado del servicio.
          </p>
          {errorMessage && (
            <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 truncate">
              {errorMessage}
            </p>
          )}
          <Button 
            type="button"
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            className="w-full mt-2"
          >
            Reintentar Conexión
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
