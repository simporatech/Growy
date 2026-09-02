import React from 'react';

/**
 * AmbientBackground Component
 * Hardware-accelerated GPU orbs with SVG fractal dithering noise texture
 * to eliminate color banding, pixelation, and dark gradient stepping on high-resolution displays.
 */
export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#090C10]">
      {/* Orbe 1: Superior Izquierda/Centro */}
      <div className="glow-orb-1" />

      {/* Orbe 2: Inferior Derecha */}
      <div className="glow-orb-2" />

      {/* Orbe 3: Centro Izquierda */}
      <div className="glow-orb-3" />

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
