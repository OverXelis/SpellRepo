'use client';

import { useState } from 'react';

export function DecorativeBooks() {
  const [imageError, setImageError] = useState(false);

  // Don't render anything if image fails to load
  if (imageError) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 z-0 pointer-events-none select-none"
      style={{
        opacity: 0.9,
      }}
    >
      {/* Using regular img tag for simpler loading */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/spell-books.png"
        alt="Stack of old spell books"
        width={980}
        height={1120}
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.5))',
        }}
        onError={() => setImageError(true)}
      />
      
      {/* Ambient warm glow beneath books */}
      <div 
        className="absolute bottom-0 left-0 w-[400px] h-[200px]"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(201, 162, 39, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
