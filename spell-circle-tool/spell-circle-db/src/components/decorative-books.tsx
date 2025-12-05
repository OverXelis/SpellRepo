'use client';

import Image from 'next/image';

export function DecorativeBooks() {
  return (
    <div 
      className="fixed bottom-0 left-0 z-0 pointer-events-none select-none"
      style={{
        opacity: 0.9,
      }}
    >
      <Image
        src="/images/spell-books.png"
        alt="Stack of old spell books"
        width={280}
        height={320}
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))',
        }}
        priority={false}
      />
      
      {/* Ambient warm glow beneath books */}
      <div 
        className="absolute bottom-0 left-0 w-72 h-40"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(201, 162, 39, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
