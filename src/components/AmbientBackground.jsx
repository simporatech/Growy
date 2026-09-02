import React from 'react';

/**
 * AmbientBackground Component
 * Boosted hardware-accelerated ambient glow orbs linked to active theme accent.
 * Configured with z-0 and organic continuous motion.
 */
export default function AmbientBackground() {
  const accentColor = 'var(--accent, #97F2CC)';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Orbe Principal Superior */}
      <div 
        className="absolute -top-[10%] left-[15%] w-[650px] h-[650px] rounded-full blur-[100px] opacity-25 animate-ambient-slow pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 65%)`,
          willChange: 'transform'
        }}
      />

      {/* Orbe Secundario Inferior */}
      <div 
        className="absolute top-[45%] -right-[5%] w-[550px] h-[550px] rounded-full blur-[110px] opacity-20 animate-ambient-reverse pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 65%)`,
          willChange: 'transform'
        }}
      />

      {/* Textura sutil de dithering anti-banding */}
      <div 
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
}
