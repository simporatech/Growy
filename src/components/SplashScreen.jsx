import React from 'react';
import AmbientBackground from './AmbientBackground';

/**
 * SplashScreen Component
 * Shown during initial authentication / session validation.
 * Eliminates login flash (auth flicker) on page load and hard reload.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#090C10] flex flex-col items-center justify-center z-50 select-none">
      <AmbientBackground />

      <div className="relative flex items-center justify-center">
        {/* Glow halo */}
        <div className="absolute w-24 h-24 rounded-full bg-[var(--color-primary,#97F2CC)]/20 blur-xl animate-pulse" />
        
        {/* Logo Card */}
        <div className="relative w-16 h-16 rounded-2xl bg-[#121721] border border-white/10 flex items-center justify-center shadow-2xl z-10">
          <img src="/logos/Transparent.svg" alt="Growy" className="w-9 h-9 object-contain" />
        </div>

        {/* Outer Ring Ping */}
        <div className="absolute inset-0 rounded-2xl border-2 border-[var(--color-primary,#97F2CC)]/30 animate-ping opacity-30 pointer-events-none" />
      </div>

      {/* Sync Label */}
      <p className="mt-5 text-xs font-semibold text-slate-400 tracking-widest uppercase animate-pulse">
        Sincronizando...
      </p>
    </div>
  );
}
