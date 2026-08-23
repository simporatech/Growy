import React from 'react';

/**
 * AmbientBackground Component
 * Hardware-accelerated GPU orbs with SVG fractal dithering noise texture
 * to eliminate color banding, pixelation, and dark gradient stepping on high-resolution displays.
 */
export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#090C10]">
      {/* Orbe 1: Superior Izquierda - Hardware Accelerated + Subpixel Smoothing */}
      <div 
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-40 will-change-transform transform-gpu transition-colors duration-500 pointer-events-none"
        style={{ 
          backgroundColor: 'var(--color-glow, rgba(151, 242, 204, 0.12))',
          transform: 'translate3d(0, 0, 0)'
        }}
      />

      {/* Orbe 2: Centro Derecha */}
      <div 
        className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] opacity-30 will-change-transform transform-gpu transition-colors duration-500 pointer-events-none"
        style={{ 
          backgroundColor: 'var(--color-glow, rgba(151, 242, 204, 0.08))',
          transform: 'translate3d(0, 0, 0)'
        }}
      />

      {/* Textura de Dithering Anti-Banding (Ruido SVG inline sin peticiones de red) */}
      <div 
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
}
